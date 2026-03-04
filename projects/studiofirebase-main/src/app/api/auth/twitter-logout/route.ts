import { NextResponse } from 'next/server';

export async function POST() {
    const res = NextResponse.json({ success: true });
    res.cookies.delete('twitter_access_token');
    res.cookies.delete('twitter_refresh_token');
    return res;
}
