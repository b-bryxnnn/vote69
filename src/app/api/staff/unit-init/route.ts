import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: Get unit init data for current user's assigned unit
export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth(request, 'STAFF');
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { pollingUnitId: true },
        });

        if (!user?.pollingUnitId) {
            return NextResponse.json({ error: 'ไม่ได้ผูกหน่วยเลือกตั้ง' }, { status: 400 });
        }

        const unit = await prisma.pollingUnit.findUnique({
            where: { id: user.pollingUnitId },
        });

        return NextResponse.json(unit);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// PUT: Update unit init data (voters, ballots received, ballots remaining)
export async function PUT(request: NextRequest) {
    try {
        const session = await requireAuth(request, 'STAFF');
        const data = await request.json() as {
            totalEligible: number;
            ballotsIssued: number;
            ballotsRemaining: number;
        };

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { pollingUnitId: true },
        });

        if (!user?.pollingUnitId) {
            return NextResponse.json({ error: 'ไม่ได้ผูกหน่วยเลือกตั้ง' }, { status: 400 });
        }

        const unit = await prisma.pollingUnit.update({
            where: { id: user.pollingUnitId },
            data: {
                totalEligible: data.totalEligible,
                ballotsIssued: data.ballotsIssued,
            },
        });

        return NextResponse.json(unit);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
