import fs from 'fs';
import path from 'path';

describe('storage.rules mediaAccess guard', () => {
  it('verifies mediaAccess rule structure and required conditions', () => {
    const rulesPath = path.resolve(process.cwd(), 'storage.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    expect(rules).toContain('match /media/{ownerUid}/{fileName}');
    expect(rules).toContain('/documents/mediaAccess/');
    expect(rules).toContain('.data.active == true');
    expect(rules).toContain('.data.plan == "lifetime"');
    expect(rules).toContain('.data.expiresAt > request.time');
    expect(rules).toContain('request.auth.uid == ownerUid');
  });
});
