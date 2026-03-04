import { NextRequest, NextResponse } from 'next/server';

// Start Twitter OAuth: redirect to admin connect endpoint
export async function GET(req: NextRequest) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const target = new URL('/api/admin/twitter/connect', base);
    return NextResponse.redirect(target);
}
