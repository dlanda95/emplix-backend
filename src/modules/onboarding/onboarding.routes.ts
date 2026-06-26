import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import * as controller from './onboarding.controller';

const router = Router();

router.use(authMiddleware);

router.get(  '/profile', controller.getOnboardingProfile);
router.patch('/data',    controller.saveOnboardingData);
router.post( '/submit',  controller.submitOnboarding);

export default router;
