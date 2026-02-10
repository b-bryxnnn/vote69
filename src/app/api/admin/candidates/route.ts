import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const candidates = await prisma.candidate.findMany({
            orderBy: { number: 'asc' },
        });
        return NextResponse.json(candidates);
    } catch {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const data = await request.json() as {
            number: number; name: string; partyName: string; photoUrl?: string; themeColor?: string;
        };

        if (!data.number || !data.name || !data.partyName) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
        }

        const candidate = await prisma.candidate.create({
            data: {
                number: data.number,
                name: data.name,
                partyName: data.partyName,
                photoUrl: data.photoUrl || null,
                themeColor: data.themeColor || '#3B82F6',
            },
        });

        return NextResponse.json(candidate, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
