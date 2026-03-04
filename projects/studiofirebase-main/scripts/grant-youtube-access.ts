import { YouTubeAccessService } from '../src/services/youtubeAccessService';

const email = process.argv[2];

if (!email) {
  console.error('Usage: tsx scripts/grant-youtube-access.ts <email>');
  process.exit(1);
}

const run = async () => {
  await YouTubeAccessService.grantAccess(email);
  console.log(`OK: access granted for ${email}`);
};

run().catch((error) => {
  console.error('FAIL: unable to grant access.', error);
  process.exit(1);
});
