import { NextRequest, NextResponse } from 'next/server';

// Alias callback to support configured redirect URIs
export async function GET(req: NextRequest) {
    const url = new URL('/api/admin/twitter/callback', req.nextUrl.origin);
    for (const [k, v] of req.nextUrl.searchParams.entries()) {
        url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
}
