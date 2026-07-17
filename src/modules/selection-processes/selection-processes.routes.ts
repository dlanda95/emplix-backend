import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/multer.config';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createSelectionProcessSchema,
  updateSelectionProcessSchema,
} from './selection-processes.schemas';
import { submitApprovalSchema } from './approvals.schemas';
import * as controller  from './selection-processes.controller';
import * as approvals   from './approvals.controller';
import * as hrAnalysis  from './hr-analysis.controller';

const router = Router();

const hrOnly    = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']);
const anyAuth   = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST', 'EMPLOYEE']);

router.use(authMiddleware);

// ── Procesos (HR) ─────────────────────────────────────────────────────────────
router.get(  '/',      hrOnly,                                          controller.listSelectionProcesses);
router.post( '/',      hrOnly, validate(createSelectionProcessSchema),  controller.createSelectionProcess);
router.patch('/:id',   hrOnly, validate(updateSelectionProcessSchema),  controller.updateSelectionProcess);

// ── Mis procesos (solo aprobadores EMPLOYEE) ──────────────────────────────────
router.get('/my-processes', anyAuth, approvals.listMyProcesses);

// ── Detalle y candidatos (HR + aprobadores autorizados) ───────────────────────
router.get('/code/:code',     anyAuth, controller.getSelectionProcessByCode);
router.get('/:id',            anyAuth, controller.getSelectionProcess);
router.get('/:id/candidates', anyAuth, controller.getSelectionProcessCandidates);

// ── Aprobaciones ──────────────────────────────────────────────────────────────
router.get( '/:id/candidates/:candidateId/approvals',
  anyAuth,
  approvals.getCandidateApprovals,
);
router.post('/:id/candidates/:candidateId/approve',
  anyAuth,
  validate(submitApprovalSchema),
  approvals.submitApproval,
);

// ── Convertir a colaborador (HR only) ─────────────────────────────────────────
router.post('/:id/candidates/:candidateId/convert',
  hrOnly,
  approvals.convertToEmployee,
);

// ── Análisis de RR.HH. ────────────────────────────────────────────────────────
router.get(   '/:id/hr-analyses',                                                  anyAuth, hrAnalysis.getProcessHRAnalyses);
router.get(   '/:id/candidates/:candidateId/hr-analysis',                          anyAuth, hrAnalysis.getHRAnalysis);
router.put(   '/:id/candidates/:candidateId/hr-analysis',                          hrOnly,  hrAnalysis.upsertHRAnalysis);
router.post(  '/:id/candidates/:candidateId/hr-analysis/documents',                hrOnly,  upload.single('file'), hrAnalysis.uploadHRAnalysisDocument);
router.delete('/:id/candidates/:candidateId/hr-analysis/documents/:docId',         hrOnly,  hrAnalysis.deleteHRAnalysisDocument);
router.get(   '/:id/candidates/:candidateId/hr-analysis/documents/:docId/url',     anyAuth, hrAnalysis.getHRAnalysisDocumentUrl);

export default router;
