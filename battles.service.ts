import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function castVote(
    battleId: string,
    entryId: string,
    userId: string
) {
    return prisma.$transaction(async (tx: PrismaClient) => {
        // Check if user already voted
        const existingVote = await tx.battleVote.findUnique({
            where: { entryId_userId: { entryId, userId } },
        });

        if (existingVote) {
            throw new Error('Already voted for this entry');
        }

        // Record vote
        await tx.battleVote.create({
            data: { entryId, userId },
        });

        // Increment vote count
        await tx.battleEntry.update({
            where: { id: entryId },
            data: { votes: { increment: 1 } },
        });

        // Recalculate all scores atomically within transaction
        const allEntries = await tx.battleEntry.findMany({
            where: { battleId },
            select: { id: true, votes: true, baseScore: true },
        });

        const totalVotes = allEntries.reduce((sum: number, e: { votes: number }) => sum + e.votes, 0);

        // Batch update all entries
        await Promise.all(
            allEntries.map((e: { id: string; votes: number; baseScore: number }) => {
                const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
                const voteScore = voteShare * 40;
                const finalScore = e.baseScore * 0.6 + voteScore;

                return tx.battleEntry.update({
                    where: { id: e.id },
                    data: {
                        voteScore: Math.round(voteScore * 100) / 100,
                        finalScore: Math.round(finalScore * 100) / 100,
                    },
                });
            })
        );
    }, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
    });
}