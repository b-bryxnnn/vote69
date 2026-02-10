import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json() as { username: string; password: string };

        if (!username || !password) {
            return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
        }

        // Generate unique session token (1 account = 1 device)
        const sessionToken = randomBytes(32).toString('hex');

        // Save session token to DB (invalidates any previous session)
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionToken: sessionToken },
        });

        const token = await createToken({
            userId: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            sessionToken,
        });

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username, role: user.role, name: user.name },
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
