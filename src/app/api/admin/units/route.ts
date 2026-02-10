import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const units = await prisma.pollingUnit.findMany({
            orderBy: [{ grade: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json(units);
    } catch {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const data = await request.json() as {
            name: string; grade: string; totalEligible?: number; ballotsIssued?: number;
        };

        if (!data.name || !data.grade) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
        }

        const unit = await prisma.pollingUnit.create({
            data: {
                name: data.name,
                grade: data.grade,
                totalEligible: data.totalEligible || 0,
                ballotsIssued: data.ballotsIssued || 0,
            },
        });

        return NextResponse.json(unit, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
