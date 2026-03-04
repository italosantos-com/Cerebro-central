#!/usr/bin/env ts-node

/**
 * Migration Script: Profile Settings to Individual Admin Profiles
 * 
 * This script migrates the global ProfileSettings from admin/profileSettings
 * to individual admin profile settings at admins/{uid}/profile/settings.
 * 
 * Usage: ts-node scripts/migrate-profile-settings.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

interface ProfileSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  description?: string;
  profilePictureUrl: string;
  coverPhotoUrl: string;
  galleryPhotos: { url: string }[];
  [key: string]: any;
}

async function migrateProfileSettings() {
  console.log('🚀 Starting Profile Settings Migration...\n');

  try {
    // 1. Fetch the global ProfileSettings
    console.log('📦 Fetching global ProfileSettings...');
    const globalSettingsDoc = await db.collection('admin').doc('profileSettings').get();

    if (!globalSettingsDoc.exists) {
      console.log('⚠️  No global ProfileSettings found. Nothing to migrate.');
      return;
    }

    const globalSettings = globalSettingsDoc.data() as ProfileSettings;
    console.log('✅ Global ProfileSettings loaded successfully');
    console.log(`   Name: ${globalSettings.name || 'N/A'}`);
    console.log(`   Email: ${globalSettings.email || 'N/A'}\n`);

    // 2. Fetch all admins
    console.log('👥 Fetching all admin users...');
    const adminsSnapshot = await db.collection('admins').get();

    if (adminsSnapshot.empty) {
      console.log('⚠️  No admin users found. Nothing to migrate.');
      return;
    }

    console.log(`✅ Found ${adminsSnapshot.size} admin(s)\n`);

    // 3. Migrate settings to each admin
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const adminDoc of adminsSnapshot.docs) {
      const adminUid = adminDoc.id;
      const adminData = adminDoc.data();
      
      console.log(`\n📝 Processing admin: ${adminData.name || adminUid}`);
      console.log(`   UID: ${adminUid}`);
      console.log(`   Email: ${adminData.email}`);
      console.log(`   Username: ${adminData.username || 'N/A'}`);

      try {
        // Check if admin already has profile settings
        const profileSettingsRef = db
          .collection('admins')
          .doc(adminUid)
          .collection('profile')
          .doc('settings');

        const existingSettings = await profileSettingsRef.get();

        if (existingSettings.exists) {
          console.log('   ⏭️  Profile settings already exist, skipping...');
          skipCount++;
          continue;
        }

        // Create personalized settings for this admin
        const personalizedSettings: ProfileSettings = {
          ...globalSettings,
          // Override with admin-specific data if available
          name: adminData.name || globalSettings.name,
          email: adminData.email || globalSettings.email,
          phone: adminData.phone || globalSettings.phone || '',
        };

        // Save to individual admin profile
        await profileSettingsRef.set(personalizedSettings);
        
        console.log('   ✅ Profile settings migrated successfully');
        successCount++;

      } catch (error: any) {
        console.error(`   ❌ Error migrating settings for ${adminUid}:`, error.message);
        errorCount++;
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total admins processed: ${adminsSnapshot.size}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n💡 Note: The global ProfileSettings at admin/profileSettings');
      console.log('   has been kept for backward compatibility.');
      console.log('   You can delete it manually if no longer needed.');
    }

    console.log('\n✨ Migration completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateProfileSettings()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
