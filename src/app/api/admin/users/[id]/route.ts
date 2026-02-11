import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(request, 'ADMIN');
        const { id } = await params;
        const data = await request.json() as {
            username?: string; password?: string; name?: string;
            role?: 'ADMIN' | 'STAFF'; pollingUnitId?: number | null;
        };

        const updateData: Record<string, unknown> = {};
        if (data.username) updateData.username = data.username;
        if (data.name) updateData.name = data.name;
        if (data.role) updateData.role = data.role;
        if (data.pollingUnitId !== undefined) updateData.pollingUnitId = data.pollingUnitId;

        // Hash and set new password if provided (non-empty)
        if (data.password && data.password.trim().length > 0) {
            updateData.password = await bcrypt.hash(data.password, 12);
            // Invalidate user's session so they must re-login with new password
            updateData.activeSessionToken = null;
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, username: true, role: true, name: true, pollingUnitId: true, createdAt: true },
        });

        return NextResponse.json(user);
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(request, 'ADMIN');
        const { id } = await params;
        await prisma.user.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
