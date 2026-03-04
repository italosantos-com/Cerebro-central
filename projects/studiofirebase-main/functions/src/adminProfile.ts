// functions/src/adminProfile.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Define the default profile settings for admin users
const DEFAULT_ADMIN_PROFILE_SETTINGS = {
  theme: 'dark',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  language: 'en',
  adminDashboardAccess: {
    users: {
      read: true,
      write: true,
    },
    settings: {
      read: true,
      write: true,
    },
  },
  reporting: {
    enabled: true,
    frequency: 'weekly',
  },
};

/**
 * Firestore Cloud Function to set default profile settings for new admin users
 * or when a user's role is updated to 'admin'.
 * It triggers on any write (create, update, delete) to a user document.
 */
export const enforceAdminProfileSettings = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userData = change.after.data();
    const previousUserData = change.before.data();

    // If document was deleted, do nothing
    if (!userData) {
      console.log('User document deleted, doing nothing.');
      return null;
    }

    const userId = context.params.userId;
    const isAdmin = userData.role === 'admin';
    const wasAdmin = previousUserData && previousUserData.role === 'admin';

    // Check if the user is now an admin or was already an admin
    if (isAdmin) {
      console.log(`User ${userId} is an admin. Checking profile settings.`);

      // Get current profile settings or an empty object if not present
      const currentProfileSettings = userData.profileSettings || {};

      // Check for missing default admin settings
      // This is a deep merge for demonstration, a simpler object spread might suffice
      const updatedProfileSettings = { ...DEFAULT_ADMIN_PROFILE_SETTINGS };

      // Recursively merge existing settings with defaults
      const mergeDeep = (target: any, source: any) => {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
              target[key] = mergeDeep(target[key] || {}, source[key]);
            } else {
              if (!(key in target)) { // Only add if not already present
                target[key] = source[key];
              }
            }
          }
        }
        return target;
      };

      let changed = false;
      const finalProfileSettings = mergeDeep({ ...currentProfileSettings }, DEFAULT_ADMIN_PROFILE_SETTINGS);

      // Check if any settings were actually updated/added
      // A more robust check would involve deep comparison, but for simplicity, we check if objects are different.
      if (JSON.stringify(finalProfileSettings) !== JSON.stringify(currentProfileSettings)) {
        changed = true;
      }


      if (changed || !userData.profileSettings) {
        console.log(`Updating profileSettings for admin user ${userId}.`);
        await db.collection('users').doc(userId).update({
          profileSettings: finalProfileSettings,
        });
        console.log(`profileSettings updated for admin user ${userId}.`);
      } else {
        console.log(`No updates needed for profileSettings for admin user ${userId}.`);
      }
    } else if (wasAdmin && !isAdmin) {
      // Optional: If user was an admin and is no longer, clean up admin-specific settings
      console.log(`User ${userId} was an admin and is no longer. Optional: Clean up admin-specific profile settings.`);
      // Example: remove adminDashboardAccess, but keep other general settings
      const currentProfileSettings = userData.profileSettings || {};
      if (currentProfileSettings.adminDashboardAccess) {
        const { adminDashboardAccess, ...rest } = currentProfileSettings;
        await db.collection('users').doc(userId).update({
          profileSettings: rest,
        });
        console.log(`Cleaned up admin-specific profile settings for user ${userId}.`);
      }
    }

    return null;
  });