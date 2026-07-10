import { Request, Response } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { z } from 'zod';

const querySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    city: z.string().optional(),
    genre: z.string().optional(),
});

export async function getRankings(req: Request, res: Response) {
    const { page, limit, city, genre } = querySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
        isPublic: true,
        rankingScore: { gt: 0 },
        ...(city && { city: { equals: city, mode: 'insensitive' } }),
        ...(genre && { genres: { has: genre } }),
    };

    const [djs, total] = await Promise.all([
        prisma.djProfile.findMany({
            where,
            orderBy: [{ rankingScore: 'desc' }, { rankingPosition: 'asc' }],
            skip,
            take: limit,
            select: {
                id: true,
                stageName: true,
                avatar: true,
                city: true,
                genres: true,
                rankingScore: true,
                rankingPosition: true,
                totalFollowers: true,
                totalMixes: true,
                verified: true,
            },
        }),
        prisma.djProfile.count({ where }),
    ]);

    res.json({
        success: true,
        data: djs,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
}