import { z } from 'zod';

export const submitApprovalSchema = z.object({
  status:  z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(1000).optional(),
});
