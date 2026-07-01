import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createCandidateSchema, hrDataSchema } from './candidates.schemas';
import * as controller from './candidates.controller';

const router = Router();
const hrOnly = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']);

router.use(authMiddleware);

router.get(   '/',            hrOnly,                                              controller.listCandidates);
router.post(  '/',            hrOnly, validate(createCandidateSchema),             controller.createCandidate);
router.get(   '/:id',         hrOnly,                                              controller.getCandidate);
router.patch( '/:id/hr-data', hrOnly, validate(hrDataSchema),                     controller.updateHrData);
router.post(  '/:id/activate',requireRole(['COMPANY_ADMIN', 'HR_MANAGER']),        controller.activateCandidate);

export default router;
