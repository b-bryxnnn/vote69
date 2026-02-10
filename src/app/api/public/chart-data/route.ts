import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const config = await prisma.systemConfig.findFirst({ where: { id: 1 } });
        if (!config?.publicViewEnabled) {
            return NextResponse.json({ enabled: false });
        }

        const candidates = await prisma.candidate.findMany({ orderBy: { number: 'asc' } });
        const units = await prisma.pollingUnit.findMany({ orderBy: [{ grade: 'asc' }, { name: 'asc' }] });

        // Get unique grades
        const grades = [...new Set(units.map((u) => u.grade))].sort();

        // Build chart data: per grade, sum of votes per candidate
        const chartData = await Promise.all(
            grades.map(async (grade) => {
                const gradeUnits = units.filter((u) => u.grade === grade);
                const gradeUnitIds = gradeUnits.map((u) => u.id);

                const dataPoint: Record<string, string | number> = { grade };

                for (const candidate of candidates) {
                    // Get latest official votes for this grade
                    let totalForGrade = 0;
                    for (const unitId of gradeUnitIds) {
                        const latestSubmission = await prisma.unitSubmission.findFirst({
                            where: { pollingUnitId: unitId },
                            orderBy: { round: 'desc' },
                        });

                        if (latestSubmission) {
                            const result = await prisma.voteResult.findFirst({
                                where: {
                                    candidateId: candidate.id,
                                    pollingUnitId: unitId,
                                    round: latestSubmission.round,
                                },
                            });
                            totalForGrade += result?.voteCount || 0;
                        } else {
                            // Fallback to live tally
                            const tally = await prisma.liveTally.findFirst({
                                where: {
                                    candidateId: candidate.id,
                                    pollingUnitId: unitId,
                                    tallyType: 'CANDIDATE',
                                },
                            });
                            totalForGrade += tally?.count || 0;
                        }
                    }

                    dataPoint[`candidate_${candidate.id}`] = totalForGrade;
                    dataPoint[`candidate_${candidate.id}_name`] = `หมายเลข ${candidate.number} ${candidate.name}`;
                    dataPoint[`candidate_${candidate.id}_color`] = candidate.themeColor;
                }

                return dataPoint;
            })
        );

        return NextResponse.json({
            enabled: true,
            chartData,
            candidates: candidates.map((c) => ({
                id: c.id,
                number: c.number,
                name: c.name,
                partyName: c.partyName,
                themeColor: c.themeColor,
                photoUrl: c.photoUrl,
            })),
        });
    } catch (error) {
        console.error('Chart data error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
