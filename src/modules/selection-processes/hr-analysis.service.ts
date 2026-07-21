import { randomUUID } from 'crypto';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import { StorageService } from '../../shared/services/storage.service';

export interface UpsertHRAnalysisDto {
  professionalSummary?:  string | null;
  strengths?:            string | null;
  improvementAreas?:     string | null;
  interviewResults?:     string | null;
  competencyEvaluation?: string | null;
  identifiedRisks?:      string | null;
  recommendation?:       string;
  recommendationNotes?:  string | null;
  salaryExpectation?:    number | null;
}

const ANALYSIS_INCLUDE = {
  documents: { orderBy: { createdAt: 'asc' as const } },
};

async function enrichWithCreatorName(analyses: any[], db: PrismaClient): Promise<any[]> {
  const creatorIds: string[] = Array.from(
    new Set<string>(analyses.map((a: any) => a.createdById).filter(Boolean) as string[]),
  );
  if (creatorIds.length === 0) return analyses.map(a => ({ ...a, createdByName: null }));

  const employees = await db.employee.findMany({
    where:  { userId: { in: creatorIds } },
    select: { userId: true, firstName: true, lastName: true },
  });
  const nameMap = new Map<string, string>(
    employees.map((e: any) => [e.userId as string, `${e.firstName} ${e.lastName}`]),
  );
  return analyses.map(a => ({
    ...a,
    salaryExpectation: a.salaryExpectation !== null && a.salaryExpectation !== undefined
      ? Number(a.salaryExpectation)
      : null,
    createdByName: a.createdById ? (nameMap.get(a.createdById) ?? null) : null,
  }));
}

export class HRAnalysisService {
  private readonly storage = new StorageService();

  private async assertCandidate(processId: string, candidateId: string, db: PrismaClient) {
    const process = await (db as any).selectionProcess.findUnique({
      where: { id: processId }, select: { id: true },
    });
    if (!process) throw new AppError('Proceso no encontrado.', 404, 'NOT_FOUND');

    const candidate = await db.employee.findFirst({
      where: { id: candidateId, selectionProcessId: processId }, select: { id: true },
    });
    if (!candidate) throw new AppError('Candidato no encontrado en este proceso.', 404, 'NOT_FOUND');
  }

  async getAnalysis(processId: string, candidateId: string, db: PrismaClient) {
    const analysis = await (db as any).hRCandidateAnalysis.findUnique({
      where:   { selectionProcessId_candidateId: { selectionProcessId: processId, candidateId } },
      include: ANALYSIS_INCLUDE,
    });
    if (!analysis) return null;
    const [enriched] = await enrichWithCreatorName([analysis], db);
    return enriched;
  }

  async upsertAnalysis(
    processId: string, candidateId: string, dto: UpsertHRAnalysisDto,
    createdById: string, db: PrismaClient,
  ) {
    await this.assertCandidate(processId, candidateId, db);
    const result = await (db as any).hRCandidateAnalysis.upsert({
      where:  { selectionProcessId_candidateId: { selectionProcessId: processId, candidateId } },
      create: { id: randomUUID(), selectionProcessId: processId, candidateId, createdById, ...dto },
      update: { ...dto },
      include: ANALYSIS_INCLUDE,
    });
    const [enriched] = await enrichWithCreatorName([result], db);
    return enriched;
  }

  async uploadDocument(
    processId: string, candidateId: string, file: Express.Multer.File,
    tenantSlug: string, uploadedById: string, db: PrismaClient,
  ) {
    await this.assertCandidate(processId, candidateId, db);

    let analysis = await (db as any).hRCandidateAnalysis.findUnique({
      where:  { selectionProcessId_candidateId: { selectionProcessId: processId, candidateId } },
      select: { id: true },
    });
    if (!analysis) {
      analysis = await (db as any).hRCandidateAnalysis.create({
        data:   { id: randomUUID(), selectionProcessId: processId, candidateId, createdById: uploadedById },
        select: { id: true },
      });
    }

    const folder = `tenants/${tenantSlug}/hr-analysis/${analysis.id}`;
    const upload = await this.storage.uploadFile(file, 'private-docs', folder);

    return (db as any).hRAnalysisDocument.create({
      data: {
        id:          randomUUID(),
        analysisId:  analysis.id,
        name:        file.originalname,
        originalName: file.originalname,
        mimeType:    upload.mimeType,
        size:        upload.size,
        path:        upload.path,
        uploadedById,
      },
    });
  }

  async deleteDocument(docId: string, db: PrismaClient) {
    const doc = await (db as any).hRAnalysisDocument.findUnique({
      where: { id: docId }, select: { path: true },
    });
    if (!doc) throw new AppError('Documento no encontrado.', 404, 'NOT_FOUND');
    try { await this.storage.deleteFile('private-docs', doc.path); } catch { /* blob ya eliminado */ }
    await (db as any).hRAnalysisDocument.delete({ where: { id: docId } });
  }

  async getAnalysesForProcess(processId: string, db: PrismaClient) {
    const analyses = await (db as any).hRCandidateAnalysis.findMany({
      where:   { selectionProcessId: processId },
      include: ANALYSIS_INCLUDE,
      orderBy: { createdAt: 'asc' as const },
    });
    return enrichWithCreatorName(analyses, db);
  }

  async getDocumentUrl(docId: string, db: PrismaClient): Promise<string> {
    const doc = await (db as any).hRAnalysisDocument.findUnique({
      where: { id: docId }, select: { path: true },
    });
    if (!doc) throw new AppError('Documento no encontrado.', 404, 'NOT_FOUND');
    return this.storage.getSignedUrl('private-docs', doc.path, 60);
  }
}
