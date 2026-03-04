import { getAdminDb } from '@/lib/firebase-admin';

export type SocialChannel = 'whatsapp' | 'facebook' | 'instagram' | 'twitter';

export type ChannelMessageRecord = {
  id: string;
  adminUid: string;
  channel: SocialChannel;
  externalId: string | null;
  sender: string;
  recipient: string | null;
  conversationId: string;
  text: string;
  read: boolean;
  metadata: any;
  timestamp: Date;
};

const safeKeyPart = (value: string) => {
  const normalized = String(value || '').trim() || 'unknown';
  // Firestore doc IDs cannot contain '/'
  return normalized.replaceAll('/', '_').slice(0, 64);
};

const safeExternalId = (externalId: string) => encodeURIComponent(String(externalId));

export const makeMessageDocId = (sender: string, externalId: string) => {
  return `${safeKeyPart(sender)}_${safeExternalId(externalId)}`;
};

export function getChannelMessagesCollection(adminUid: string, channel: SocialChannel) {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firebase Admin não inicializado (Firestore indisponível).');
  }

  return db
    .collection('admins')
    .doc(adminUid)
    .collection('channels')
    .doc(channel)
    .collection('messages');
}

export async function saveChannelMessage(input: {
  adminUid: string;
  channel: SocialChannel;
  externalId?: string | null;
  sender: string;
  recipient?: string | null;
  conversationId: string;
  text: string | null;
  read: boolean;
  metadata?: any;
  timestamp?: Date;
}): Promise<ChannelMessageRecord> {
  const {
    adminUid,
    channel,
    externalId,
    sender,
    recipient = null,
    conversationId,
    text,
    read,
    metadata = {},
    timestamp = new Date(),
  } = input;

  const col = getChannelMessagesCollection(adminUid, channel);

  const data = {
    adminUid,
    channel,
    externalId: externalId ?? null,
    sender,
    recipient,
    conversationId,
    text: String(text ?? ''),
    read: Boolean(read),
    metadata: metadata ?? {},
    timestamp,
  };

  if (externalId) {
    const id = makeMessageDocId(sender, externalId);
    await col.doc(id).set(data, { merge: true });
    return { id, ...data };
  }

  const docRef = await col.add(data);
  return { id: docRef.id, ...data };
}

export async function getChannelMessageByExternalId(input: {
  adminUid: string;
  channel: SocialChannel;
  sender: string;
  externalId: string;
}): Promise<(ChannelMessageRecord & { exists: true }) | { exists: false; id: string }> {
  const { adminUid, channel, sender, externalId } = input;
  const col = getChannelMessagesCollection(adminUid, channel);
  const id = makeMessageDocId(sender, externalId);
  const snap = await col.doc(id).get();

  if (!snap.exists) {
    return { exists: false, id };
  }

  const raw = snap.data() as any;
  const timestamp: Date = raw?.timestamp?.toDate?.() || raw?.timestamp || new Date();

  return {
    exists: true,
    id: snap.id,
    adminUid: String(raw?.adminUid ?? adminUid),
    channel,
    externalId: raw?.externalId ?? externalId,
    sender: String(raw?.sender ?? sender),
    recipient: raw?.recipient ?? null,
    conversationId: String(raw?.conversationId ?? ''),
    text: String(raw?.text ?? ''),
    read: Boolean(raw?.read),
    metadata: raw?.metadata ?? {},
    timestamp,
  };
}

export async function mergeChannelMessageMetadata(input: {
  adminUid: string;
  channel: SocialChannel;
  sender: string;
  externalId: string;
  mutate: (current: any) => any;
}) {
  const { adminUid, channel, sender, externalId, mutate } = input;
  const col = getChannelMessagesCollection(adminUid, channel);
  const id = makeMessageDocId(sender, externalId);
  const docRef = col.doc(id);

  const snap = await docRef.get();
  const current = snap.exists ? (snap.data() as any) : {};
  const currentMeta = current?.metadata && typeof current.metadata === 'object' ? current.metadata : {};
  const nextMeta = mutate(currentMeta);

  await docRef.set(
    {
      adminUid,
      channel,
      externalId,
      sender,
      metadata: nextMeta ?? {},
    },
    { merge: true }
  );
}
