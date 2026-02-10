import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Manually fix the database schema using raw SQL
        // This is necessary because automatic migration might have failed on the server

        // Execute the SQL commands
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_token" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "polling_unit_id" INTEGER;`);

        // Try creating index (ignoring error if exists)
        try {
            await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "users_polling_unit_id_key" ON "users"("polling_unit_id");`);
        } catch {
            // Index likely already exists
        }

        return NextResponse.json({ success: true, message: 'Database schema patched successfully.' });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
