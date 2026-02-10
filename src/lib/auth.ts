import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'vote69-secret-key-change-in-production');

export interface JWTPayload {
    userId: number;
    username: string;
    role: 'ADMIN' | 'STAFF';
    name: string;
    sessionToken?: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<JWTPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function getSessionFromRequest(request: NextRequest): Promise<JWTPayload | null> {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;

    // Validate session token against DB (1 account = 1 device)
    if (payload.sessionToken) {
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { activeSessionToken: true },
        });
        if (user?.activeSessionToken && user.activeSessionToken !== payload.sessionToken) {
            return null; // Session invalidated by newer login
        }
    }

    return payload;
}

export async function requireAuth(request: NextRequest, role?: 'ADMIN' | 'STAFF'): Promise<JWTPayload> {
    const session = await getSessionFromRequest(request);
    if (!session) {
        throw new Error('UNAUTHORIZED');
    }
    if (role && session.role !== role && session.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
    }
    return session;
}
