import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Check if public view is enabled
        const config = await prisma.systemConfig.findFirst({ where: { id: 1 } });

        if (!config?.publicViewEnabled) {
            return NextResponse.json({
                enabled: false,
                message: 'ยังไม่เปิดเผยผลการเลือกตั้ง',
            });
        }

        // Get candidates
        const candidates = await prisma.candidate.findMany({
            orderBy: { number: 'asc' },
        });

        // Get latest formal results per unit (highest round)
        const units = await prisma.pollingUnit.findMany({
            include: {
                submissions: { orderBy: { round: 'desc' }, take: 1 },
            },
        });

        // Calculate official totals
        const officialResults = await Promise.all(
            candidates.map(async (candidate) => {
                // For each unit, get the latest round's vote count
                let totalOfficial = 0;
                for (const unit of units) {
                    const latestRound = unit.submissions[0]?.round;
                    if (latestRound) {
                        const result = await prisma.voteResult.findFirst({
                            where: {
                                candidateId: candidate.id,
                                pollingUnitId: unit.id,
                                round: latestRound,
                            },
                        });
                        totalOfficial += result?.voteCount || 0;
                    }
                }
                return {
                    candidateId: candidate.id,
                    candidateNumber: candidate.number,
                    candidateName: candidate.name,
                    partyName: candidate.partyName,
                    photoUrl: candidate.photoUrl,
                    themeColor: candidate.themeColor,
                    officialVotes: totalOfficial,
                };
            })
        );

        // Get live tallies totals
        const liveTallies = await prisma.liveTally.findMany({
            where: { tallyType: 'CANDIDATE' },
            include: { candidate: true },
        });

        const liveResults = candidates.map((candidate) => {
            const candidateTallies = liveTallies.filter((t) => t.candidateId === candidate.id);
            const totalLive = candidateTallies.reduce((sum, t) => sum + t.count, 0);
            return {
                candidateId: candidate.id,
                liveVotes: totalLive,
            };
        });

        // Get no-vote and void totals
        const noVoteTallies = await prisma.liveTally.findMany({
            where: { tallyType: 'NO_VOTE' },
        });
        const voidTallies = await prisma.liveTally.findMany({
            where: { tallyType: 'VOID' },
        });

        const totalLiveNoVote = noVoteTallies.reduce((sum, t) => sum + t.count, 0);
        const totalLiveVoid = voidTallies.reduce((sum, t) => sum + t.count, 0);

        // Official no-vote and void
        const officialSubmissions = await prisma.unitSubmission.findMany({
            orderBy: { round: 'desc' },
        });

        // Get unique latest submissions per unit
        const latestSubmissions = new Map<number, typeof officialSubmissions[0]>();
        for (const sub of officialSubmissions) {
            if (!latestSubmissions.has(sub.pollingUnitId)) {
                latestSubmissions.set(sub.pollingUnitId, sub);
            }
        }

        let totalOfficialNoVote = 0;
        let totalOfficialVoid = 0;
        let totalSignatures = 0;
        let totalBallotsIssued = 0;
        let totalEligible = 0;

        for (const sub of latestSubmissions.values()) {
            totalOfficialNoVote += sub.totalNoVote;
            totalOfficialVoid += sub.totalVoidBallots;
            totalSignatures += sub.totalSignatures;
            totalBallotsIssued += sub.ballotsIssued;
        }

        for (const unit of units) {
            totalEligible += unit.totalEligible;
        }

        const unitsSubmitted = latestSubmissions.size;
        const totalUnits = units.length;

        return NextResponse.json({
            enabled: true,
            config: {
                electionTitle: config.electionTitle,
                schoolName: config.schoolName,
            },
            candidates: officialResults.map((official) => {
                const live = liveResults.find((l) => l.candidateId === official.candidateId);
                return {
                    ...official,
                    liveVotes: live?.liveVotes || 0,
                };
            }),
            summary: {
                totalOfficialNoVote,
                totalOfficialVoid,
                totalLiveNoVote,
                totalLiveVoid,
                totalSignatures,
                totalBallotsIssued,
                totalEligible,
                unitsSubmitted,
                totalUnits,
                turnoutPercent: totalEligible > 0 ? ((totalSignatures / totalEligible) * 100).toFixed(1) : '0',
            },
        });
    } catch (error) {
        console.error('Public results error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
