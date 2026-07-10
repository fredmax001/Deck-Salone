import { z } from 'zod';

export const rankingUpdateSchema = z.object({
    rankingScore: z.number().finite().min(0).max(100).optional(),
    rankingPosition: z.number().int().finite().min(1).optional(),
    digitalScore: z.number().finite().min(0).max(100).optional(),
    industryScore: z.number().finite().min(0).max(100).optional(),
    communityScore: z.number().finite().min(0).max(100).optional(),
});