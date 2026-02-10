import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth(request, 'STAFF');
        const data = await request.json() as {
            pollingUnitId: number;
            totalSignatures: number;
            ballotsIssued: number;
            ballotsRemaining: number;
            totalNoVote: number;
            totalVoidBallots: number;
            votes: { candidateId: number; voteCount: number }[];
            photoEvidence?: string;
            reason?: string; // Required for recount
        };

        // Validate required fields
        if (!data.pollingUnitId || data.totalSignatures === undefined || !data.votes) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
        }

        // Validation: Total Votes == Total Signatures
        const totalCandidateVotes = data.votes.reduce((sum, v) => sum + v.voteCount, 0);
        const totalVotesCounted = totalCandidateVotes + (data.totalNoVote || 0) + (data.totalVoidBallots || 0);

        if (totalVotesCounted !== data.totalSignatures) {
            return NextResponse.json({
                error: `จำนวนไม่ตรงกัน! ผลรวมคะแนนทั้งหมด (${totalVotesCounted}) ≠ จำนวนผู้มาใช้สิทธิ์ (${data.totalSignatures}) กรุณานับใหม่หรืออธิบายเหตุผล`,
                totalVotesCounted,
                totalSignatures: data.totalSignatures,
                difference: Math.abs(totalVotesCounted - data.totalSignatures),
            }, { status: 400 });
        }

        // Check if this unit has been submitted before
        const existingSubmission = await prisma.unitSubmission.findFirst({
            where: { pollingUnitId: data.pollingUnitId },
            orderBy: { round: 'desc' },
        });

        const round = existingSubmission ? existingSubmission.round + 1 : 1;

        // If recount, require reason
        if (round > 1 && !data.reason) {
            return NextResponse.json({
                error: 'กรุณาระบุเหตุผลในการแก้ไขคะแนน (นับใหม่)',
            }, { status: 400 });
        }

        const unit = await prisma.pollingUnit.findUnique({ where: { id: data.pollingUnitId } });
        if (!unit) {
            return NextResponse.json({ error: 'ไม่พบหน่วยเลือกตั้ง' }, { status: 404 });
        }

        // Create submission and vote results in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create unit submission
            const submission = await tx.unitSubmission.create({
                data: {
                    pollingUnitId: data.pollingUnitId,
                    totalSignatures: data.totalSignatures,
                    ballotsIssued: data.ballotsIssued || 0,
                    ballotsRemaining: data.ballotsRemaining || 0,
                    totalNoVote: data.totalNoVote || 0,
                    totalVoidBallots: data.totalVoidBallots || 0,
                    photoEvidence: data.photoEvidence || null,
                    round,
                    submittedBy: session.username,
                },
            });

            // Create vote results
            const voteResults = await Promise.all(
                data.votes.map((vote) =>
                    tx.voteResult.create({
                        data: {
                            pollingUnitId: data.pollingUnitId,
                            candidateId: vote.candidateId,
                            voteCount: vote.voteCount,
                            round,
                            submittedBy: session.username,
                        },
                    })
                )
            );

            // Create audit log
            await tx.auditLog.create({
                data: {
                    action: round === 1 ? 'SUBMIT' : 'RECOUNT',
                    pollingUnit: unit.name,
                    round,
                    details: round === 1
                        ? `${unit.name} ส่งคะแนนทางการ (รอบที่ ${round}) — ผู้มาใช้สิทธิ์: ${data.totalSignatures}, บัตรเสีย: ${data.totalVoidBallots}, ไม่ประสงค์: ${data.totalNoVote}`
                        : `${unit.name} แก้ไขคะแนน (รอบที่ ${round})`,
                    reason: data.reason || null,
                    performedBy: session.username,
                },
            });

            return { submission, voteResults };
        });

        return NextResponse.json({
            success: true,
            round,
            submission: result.submission,
            message: round === 1 ? 'ส่งคะแนนสำเร็จ' : `แก้ไขคะแนนรอบที่ ${round} สำเร็จ`,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        console.error('Submit error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// GET: Get submission status for a unit
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const unitId = searchParams.get('unitId');

        if (!unitId) {
            return NextResponse.json({ error: 'กรุณาระบุหน่วยเลือกตั้ง' }, { status: 400 });
        }

        const submissions = await prisma.unitSubmission.findMany({
            where: { pollingUnitId: parseInt(unitId) },
            orderBy: { round: 'desc' },
        });

        const latestVotes = await prisma.voteResult.findMany({
            where: {
                pollingUnitId: parseInt(unitId),
                round: submissions[0]?.round || 0,
            },
            include: { candidate: true },
        });

        return NextResponse.json({
            submissions,
            latestVotes,
            currentRound: submissions[0]?.round || 0,
        });
    } catch {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
