
import crypto from 'crypto';
import { getBaseUrl } from '@/lib/utils';

export const CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
export const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
export const CALLBACK_URL = `${getBaseUrl()}/api/auth/twitter-callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Twitter OAuth environment variables are not set. Please add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to your .env.local file.');
}

export const TWITTER_OAUTH_URL = 'https://twitter.com/i/oauth2/authorize';
export const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
export const TWITTER_REVOKE_URL = 'https://api.twitter.com/2/oauth2/revoke';

// Helper function to generate a PKCE code challenge
export const generatePKCE = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
};

// Helper to construct the authorization URL
export const getAuthorizationUrl = (challenge: string, state: string) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'tweet.read users.read offline.access',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${TWITTER_OAUTH_URL}?${params.toString()}`;
};
