import { buildIceServers, isRoomExpired } from '@/lib/video-room-utils';

describe('video-room-utils', () => {
  it('always includes default stun server and only adds turn when fully configured', () => {
    expect(buildIceServers({}).iceServers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
    ]);

    expect(
      buildIceServers({
        NEXT_PUBLIC_TURN_URL: 'turn:1.2.3.4:3478',
        NEXT_PUBLIC_TURN_USERNAME: 'user',
        NEXT_PUBLIC_TURN_CREDENTIAL: 'pass',
      }).iceServers
    ).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:1.2.3.4:3478', username: 'user', credential: 'pass' },
    ]);
  });

  it('handles room expiration checks for Firestore-like timestamps', () => {
    const now = Date.now();

    expect(isRoomExpired({ toDate: () => new Date(now + 60_000) }, now)).toBe(false);
    expect(isRoomExpired({ toDate: () => new Date(now - 1) }, now)).toBe(true);
    expect(isRoomExpired(undefined, now)).toBe(true);
  });
});
