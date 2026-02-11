import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, name: true, pollingUnitId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(users);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const data = await request.json() as {
            username: string; password: string; name: string;
            role?: 'ADMIN' | 'STAFF'; pollingUnitId?: number | null;
        };

        if (!data.username || !data.password || !data.name) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
        }

        const hash = await bcrypt.hash(data.password, 12);
        const user = await prisma.user.create({
            data: {
                username: data.username,
                password: hash,
                name: data.name,
                role: data.role || 'STAFF',
                pollingUnitId: data.pollingUnitId || null,
            },
            select: { id: true, username: true, role: true, name: true, pollingUnitId: true, createdAt: true },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
