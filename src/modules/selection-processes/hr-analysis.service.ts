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
}

const ANALYSIS_INCLUDE = {
  documents: { orderBy: { createdAt: 'asc' as const } },
};

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
    return (db as any).hRCandidateAnalysis.findUnique({
      where:   { selectionProcessId_candidateId: { selectionProcessId: processId, candidateId } },
      include: ANALYSIS_INCLUDE,
    }) ?? null;
  }

  async upsertAnalysis(
    processId: string, candidateId: string, dto: UpsertHRAnalysisDto,
    createdById: string, db: PrismaClient,
  ) {
    await this.assertCandidate(processId, candidateId, db);
    return (db as any).hRCandidateAnalysis.upsert({
      where:  { selectionProcessId_candidateId: { selectionProcessId: processId, candidateId } },
      create: { id: randomUUID(), selectionProcessId: processId, candidateId, createdById, ...dto },
      update: { ...dto },
      include: ANALYSIS_INCLUDE,
    });
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
    return (db as any).hRCandidateAnalysis.findMany({
      where:   { selectionProcessId: processId },
      include: ANALYSIS_INCLUDE,
      orderBy: { createdAt: 'asc' as const },
    });
  }

  async getDocumentUrl(docId: string, db: PrismaClient): Promise<string> {
    const doc = await (db as any).hRAnalysisDocument.findUnique({
      where: { id: docId }, select: { path: true },
    });
    if (!doc) throw new AppError('Documento no encontrado.', 404, 'NOT_FOUND');
    return this.storage.getSignedUrl('private-docs', doc.path, 60);
  }
}
