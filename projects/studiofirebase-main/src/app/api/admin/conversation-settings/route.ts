import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export type ConversationSettings = {
	autoReplyEnabled: boolean;
	replyTone: 'humanized' | 'robotic';
	updatedAt?: string;
};

const DEFAULT_SETTINGS: ConversationSettings = {
	autoReplyEnabled: false,
	replyTone: 'humanized',
};

function sanitizeSettings(input: any): ConversationSettings {
	const autoReplyEnabled = Boolean(input?.autoReplyEnabled);
	const replyTone: ConversationSettings['replyTone'] = input?.replyTone === 'robotic' ? 'robotic' : 'humanized';
	return {
		autoReplyEnabled,
		replyTone,
		updatedAt: new Date().toISOString(),
	};
}

function getSettingsRefPath(adminUid: string) {
	return `admin/conversationSettings/${adminUid}`;
}

export async function GET(request: NextRequest) {
	const authResult = await requireAdminApiAuth(request);
	if (authResult instanceof NextResponse) return authResult;

	const adminApp = getAdminApp();
	if (!adminApp) {
		return NextResponse.json({ success: false, message: 'Admin app não inicializado.' }, { status: 500 });
	}

	const rtdb = getDatabase(adminApp);
	const snap = await rtdb.ref(getSettingsRefPath(authResult.uid)).get();
	const value = snap.val();

	const settings: ConversationSettings = {
		...DEFAULT_SETTINGS,
		...(value && typeof value === 'object' ? value : {}),
	};

	settings.autoReplyEnabled = Boolean((settings as any).autoReplyEnabled);
	settings.replyTone = (settings as any).replyTone === 'robotic' ? 'robotic' : 'humanized';

	return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
	const authResult = await requireAdminApiAuth(request);
	if (authResult instanceof NextResponse) return authResult;

	const adminApp = getAdminApp();
	if (!adminApp) {
		return NextResponse.json({ success: false, message: 'Admin app não inicializado.' }, { status: 500 });
	}

	const body = await request.json().catch(() => ({}));
	const sanitized = sanitizeSettings(body);

	const rtdb = getDatabase(adminApp);
	await rtdb.ref(getSettingsRefPath(authResult.uid)).set(sanitized);

	return NextResponse.json({ success: true, settings: sanitized });
}

