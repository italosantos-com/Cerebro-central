export const VIDEO_ROOM_TTL_MS = 30 * 60 * 1000;

type EnvLike = Partial<Record<string, string | undefined>>;

export function buildIceServers(env: EnvLike = process.env) {
  const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrl = env.NEXT_PUBLIC_TURN_URL?.trim();
  const turnUsername = env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCredential = env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
}

export function isRoomExpired(expiresAt: unknown, now = Date.now()): boolean {
  if (!expiresAt) {
    return true;
  }

  if (expiresAt instanceof Date) {
    return expiresAt.getTime() <= now;
  }

  if (typeof expiresAt === 'object' && expiresAt !== null && 'toDate' in expiresAt) {
    const expiresDate = (expiresAt as { toDate: () => Date }).toDate();
    return expiresDate.getTime() <= now;
  }

  return true;
}
