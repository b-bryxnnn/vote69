import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        // Seed route: create admin if no users exist
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json({ error: 'มี Admin ในระบบแล้ว' }, { status: 400 });
        }

        const hash = await bcrypt.hash('admin123', 12);
        const admin = await prisma.user.create({
            data: {
                username: 'admin',
                password: hash,
                role: 'ADMIN',
                name: 'ผู้ดูแลระบบ',
            },
        });

        // Create default system config
        await prisma.systemConfig.upsert({
            where: { id: 1 },
            update: {},
            create: {
                id: 1,
                publicViewEnabled: false,
                electionTitle: 'การเลือกตั้งสภานักเรียน',
                schoolName: 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'สร้าง Admin สำเร็จ',
            credentials: { username: 'admin', password: 'admin123' },
            user: { id: admin.id, username: admin.username, role: admin.role },
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// GET: list all users (admin only)
export async function GET(request: NextRequest) {
    try {
        await requireAuth(request, 'ADMIN');
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, name: true, createdAt: true },
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
