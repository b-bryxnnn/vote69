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
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาตรวจสอบ DATABASE_URL' }, { status: 500 });
    }
}

// GET: health check + DB setup
export async function GET() {
    try {
        // Try connecting to test DB is reachable
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: 'ok',
            message: 'เชื่อมต่อฐานข้อมูลสำเร็จ',
            dbConnected: true,
        });
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
            dbConnected: false,
            error: String(error),
        }, { status: 500 });
    }
}
