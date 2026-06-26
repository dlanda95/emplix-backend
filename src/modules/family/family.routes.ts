import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import * as controller from './family.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',       controller.getAll);
router.post('/',      controller.create);
router.patch('/:id',  controller.update);
router.delete('/:id', controller.remove);

export default router;
