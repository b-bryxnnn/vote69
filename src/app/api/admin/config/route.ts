import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const config = await prisma.systemConfig.findFirst({ where: { id: 1 } });
        if (!config) {
            const newConfig = await prisma.systemConfig.create({
                data: { id: 1 },
            });
            return NextResponse.json(newConfig);
        }
        return NextResponse.json(config);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const data = await request.json() as {
            publicViewEnabled?: boolean; electionTitle?: string; schoolName?: string;
        };

        const config = await prisma.systemConfig.upsert({
            where: { id: 1 },
            update: data,
            create: { id: 1, ...data },
        });

        return NextResponse.json(config);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
