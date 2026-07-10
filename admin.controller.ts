import { Request, Response } from 'express';
import { rankingUpdateSchema } from './admin.schema';
import { prisma } from '../../infrastructure/database/prisma';

export async function updateDjRanking(req: Request, res: Response) {
    const { id } = req.params;
    const data = rankingUpdateSchema.parse(req.body);

    const dj = await prisma.djProfile.update({
        where: { id },
        data,
    });

    res.json({ success: true, data: dj });
}