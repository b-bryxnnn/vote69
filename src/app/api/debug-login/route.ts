import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json() as { username: string; password: string };

        // 1. Check if user exists
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({
                step: 'USER_NOT_FOUND',
                username,
                allUsers: await prisma.user.findMany({ select: { id: true, username: true, role: true } }),
            });
        }

        // 2. Show stored hash info
        const storedHash = user.password;
        const hashPrefix = storedHash.substring(0, 7);
        const hashLength = storedHash.length;

        // 3. Try bcrypt compare
        const valid = await bcrypt.compare(password, storedHash);

        // 4. Generate fresh hash for comparison
        const freshHash = await bcrypt.hash(password, 12);
        const freshValid = await bcrypt.compare(password, freshHash);

        return NextResponse.json({
            step: 'COMPARE_RESULT',
            userFound: true,
            userId: user.id,
            username: user.username,
            hashPrefix,
            hashLength,
            bcryptCompareResult: valid,
            freshHashTest: freshValid,
            passwordReceived: password,
            passwordLength: password.length,
        });
    } catch (error) {
        return NextResponse.json({
            step: 'ERROR',
            error: String(error),
        }, { status: 500 });
    }
}
