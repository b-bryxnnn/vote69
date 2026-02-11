import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    try {
        const cwd = process.cwd();
        const uploadDir = join(cwd, 'public', 'uploads');
        const filePath = join(uploadDir, filename);

        console.log('Serving file:', { filename, cwd, uploadDir, filePath });

        try {
            await readFile(filePath);
        } catch (err) {
            console.error('File read error:', err);
            // List directory contents for debugging
            try {
                const files = await import('fs').then(fs => fs.promises.readdir(uploadDir));
                console.log('Files in upload dir:', files);
            } catch (readDirErr) {
                console.error('Could not read upload dir:', readDirErr);
            }
            return NextResponse.json({ error: 'File not found', details: filePath }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        // Determine content type based on extension
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';

        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'svg') contentType = 'image/svg+xml';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
