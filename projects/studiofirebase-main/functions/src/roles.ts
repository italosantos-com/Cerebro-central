// functions/src/roles.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Callable Cloud Function to set custom roles (admin, moderator, etc.) for a user.
 * This function should only be callable by a super-admin user.
 *
 * @param data.targetUid The UID of the user whose role needs to be updated.
 * @param data.role The role to set (e.g., 'admin', 'moderator', 'none').
 */
export const setAdminRole = functions.https.onCall(async (data, context) => {
  // 1. Authenticate and authorize the caller
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerUid = context.auth.uid;

  // Get the caller's role from Firestore to check if they are an admin
  const callerUserDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerUserDoc.data();
  const callerRole = callerData?.role;

  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admin users can set roles.'
    );
  }

  // 2. Validate input
  const { targetUid, role } = data;

  if (!targetUid || typeof targetUid !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The "targetUid" must be a non-empty string.'
    );
  }

  const validRoles = ['admin', 'moderator', 'user', 'none']; // 'none' to remove special role
  if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `The "role" must be one of: ${validRoles.join(', ')}.`
    );
  }

  // Prevent admin from changing their own role (optional but good practice)
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'An admin cannot change their own role using this function.'
    );
  }

  try {
    // 3. Set custom claims in Firebase Authentication
    // Remove existing role claim if role is 'none' or 'user'
    const customClaims: { role?: string } = {};
    if (role === 'admin' || role === 'moderator') {
      customClaims.role = role;
    }

    await admin.auth().setCustomUserClaims(targetUid, customClaims);
    console.log(`Custom claims set for user ${targetUid}: ${JSON.stringify(customClaims)}`);

    // 4. Update role in Firestore for consistency with next-auth's adapter
    await db.collection('users').doc(targetUid).update({ role });
    console.log(`Firestore role updated for user ${targetUid}: ${role}`);

    return { success: true, message: `Role for user ${targetUid} set to ${role}.` };
  } catch (error: any) {
    console.error(`Error setting role for user ${targetUid}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to set user role.',
      error.message
    );
  }
});
