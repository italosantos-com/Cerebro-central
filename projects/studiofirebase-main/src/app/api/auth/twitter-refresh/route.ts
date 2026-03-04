import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function POST(req: NextRequest) {
    try {
        const refreshToken = req.cookies.get('twitter_refresh_token')?.value;
        if (!refreshToken) {
            return NextResponse.json({ success: false, error: 'no_refresh_token' }, { status: 401 });
        }

        const client = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client.refreshOAuth2Token(refreshToken);

        const res = NextResponse.json({ success: true });
        res.cookies.set('twitter_access_token', accessToken, {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: Math.max(60, Math.min(expiresIn || 3600, 30 * 24 * 3600)),
        });
        if (newRefreshToken) {
            res.cookies.set('twitter_refresh_token', newRefreshToken, {
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 90 * 24 * 3600,
            });
        }
        return res;
    } catch (error) {
        console.error('Twitter refresh error:', error);
        return NextResponse.json({ success: false, error: 'refresh_failed' }, { status: 500 });
    }
}
