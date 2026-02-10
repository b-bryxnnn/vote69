import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST: Update live tally (+1, +5, -1)
export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth(request, 'STAFF');
        const data = await request.json() as {
            pollingUnitId: number;
            candidateId?: number | null;
            tallyType: 'CANDIDATE' | 'NO_VOTE' | 'VOID';
            delta: number; // +1, +5, -1, -5
        };

        if (!data.pollingUnitId || !data.tallyType) {
            return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
        }

        // Validate delta
        if (![1, 5, -1, -5].includes(data.delta)) {
            return NextResponse.json({ error: 'ค่า delta ไม่ถูกต้อง' }, { status: 400 });
        }

        const candidateId = data.tallyType === 'CANDIDATE' ? data.candidateId : null;

        // Upsert the tally
        const existing = await prisma.liveTally.findFirst({
            where: {
                pollingUnitId: data.pollingUnitId,
                candidateId: candidateId,
                tallyType: data.tallyType,
            },
        });

        let tally;
        if (existing) {
            const newCount = Math.max(0, existing.count + data.delta);
            tally = await prisma.liveTally.update({
                where: { id: existing.id },
                data: { count: newCount },
            });
        } else {
            tally = await prisma.liveTally.create({
                data: {
                    pollingUnitId: data.pollingUnitId,
                    candidateId: candidateId,
                    tallyType: data.tallyType,
                    count: Math.max(0, data.delta),
                },
            });
        }

        // Log the action
        const unit = await prisma.pollingUnit.findUnique({ where: { id: data.pollingUnitId } });

        await prisma.auditLog.create({
            data: {
                action: 'LIVE_UPDATE',
                pollingUnit: unit?.name || `Unit ${data.pollingUnitId}`,
                details: `นับสด: ${data.tallyType === 'CANDIDATE' ? `ผู้สมัคร #${candidateId}` : data.tallyType === 'NO_VOTE' ? 'ไม่ประสงค์' : 'บัตรเสีย'} ${data.delta > 0 ? '+' : ''}${data.delta} (รวม: ${tally.count})`,
                performedBy: session.username,
            },
        });

        return NextResponse.json(tally);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        console.error('Live tally error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// GET: Get live tallies for a unit
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const unitId = searchParams.get('unitId');

        if (unitId) {
            const tallies = await prisma.liveTally.findMany({
                where: { pollingUnitId: parseInt(unitId) },
                include: { candidate: true },
            });
            return NextResponse.json(tallies);
        }

        // Get all tallies grouped
        const tallies = await prisma.liveTally.findMany({
            include: { candidate: true, pollingUnit: true },
        });
        return NextResponse.json(tallies);
    } catch {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
