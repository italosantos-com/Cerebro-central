type PaypalEnvironment = 'sandbox' | 'live';

const PROD_KEYWORDS = new Set(['live', 'production', 'prod']);
const PAYPAL_BASE_URL = {
	sandbox: 'https://api-m.sandbox.paypal.com',
	live: 'https://api-m.paypal.com'
} as const;

export interface PaypalApiConfig {
	env: PaypalEnvironment;
	baseUrl: string;
	clientId: string;
	clientSecret: string;
}

const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();

export function resolvePaypalEnvironment(): PaypalEnvironment {
	const envValue = normalizeValue(process.env.PAYPAL_ENVIRONMENT) || normalizeValue(process.env.PAYPAL_ENV);

	if (PROD_KEYWORDS.has(envValue)) {
		return 'live';
	}

	if (!envValue && process.env.NODE_ENV === 'production') {
		return 'live';
	}

	return 'sandbox';
}

function resolveCredentials(env: PaypalEnvironment) {
	if (env === 'live') {
		return {
			clientId: process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_LIVE_CLIENT_ID,
			clientSecret: process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_LIVE_CLIENT_SECRET
		};
	}

	return {
		clientId: process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID,
		clientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET
	};
}

export function resolvePaypalApiConfig(): PaypalApiConfig {
	const env = resolvePaypalEnvironment();
	const { clientId, clientSecret } = resolveCredentials(env);

	if (!clientId || !clientSecret) {
		const idVar = env === 'live' ? 'PAYPAL_CLIENT_ID' : 'PAYPAL_SANDBOX_CLIENT_ID';
		const secretVar = env === 'live' ? 'PAYPAL_CLIENT_SECRET' : 'PAYPAL_SANDBOX_CLIENT_SECRET';
		throw new Error(
			`[PayPal] Credenciais ausentes para o ambiente ${env}. Configure ${idVar} e ${secretVar}.`
		);
	}

	return {
		env,
		baseUrl: PAYPAL_BASE_URL[env],
		clientId,
		clientSecret
	};
}

export async function fetchPaypalAccessToken(config?: PaypalApiConfig): Promise<string> {
	const resolved = config ?? resolvePaypalApiConfig();
	const auth = Buffer.from(`${resolved.clientId}:${resolved.clientSecret}`).toString('base64');

	const response = await fetch(`${resolved.baseUrl}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to obtain PayPal access token (status ${response.status}) env=${resolved.env}: ${errorText}`);
	}

	const data = await response.json();
	if (!data?.access_token) {
		throw new Error('PayPal response did not include access_token');
	}

	return data.access_token as string;
}

export function describePaypalConfig(): string {
	try {
		const { env, clientId } = resolvePaypalApiConfig();
		return `env=${env} client=${clientId.slice(0, 6)}***`;
	} catch (error) {
		return `env=unknown error=${error instanceof Error ? error.message : String(error)}`;
	}
}
