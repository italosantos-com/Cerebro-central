import { NextRequest, NextResponse } from 'next/server';

// Simple alias to the admin Google connect route to match existing UI open URL
export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
  const target = new URL('/api/admin/google/connect', base);
  return NextResponse.redirect(target);
}