
'use server';
/**
 * @fileOverview User authentication and payment service using Firebase Realtime Database and Storage.
 * Handles saving user data, face images, and payment details.
 * TEMPORÁRIO: Funcionalidades server-side desabilitadas quando Admin SDK não está disponível.
 */

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { resolveAdminUidByUsernameServer } from '@/lib/admin-username-resolver';

// Schema for user data to be saved.
const UserDataSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  imageBase64: z.string(),
  publicUsername: z.string().optional(),
  adminUid: z.string().optional(),
});
type UserData = z.infer<typeof UserDataSchema>;

const PaymentDetailsSchema = z.object({
  paymentId: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string(),
});
type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;

// Helper para obter recursos do Admin SDK (lazy loading)
function getAdminResources() {
  const adminApp = getAdminApp();
  const isAdminAvailable = adminApp !== null;
  const db = isAdminAvailable ? getDatabase(adminApp) : null;
  const storage = isAdminAvailable ? getStorage(adminApp) : null;
  const bucket = storage ? storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`) : null;
  
  return { adminApp, isAdminAvailable, db, storage, bucket };
}

/**
 * Saves user data to Realtime Database and uploads their face image to Storage.
 * @param userData The user's registration data.
 * @returns A Promise that resolves when the user is saved.
 */
export async function saveUser(userData: UserData): Promise<void> {
    const { isAdminAvailable, db, bucket } = getAdminResources();
    
    if (!isAdminAvailable) {
        console.log('[saveUser] Admin SDK não disponível. Funcionalidade server-side desabilitada.');
        throw new Error('Server-side functionality not available. Admin SDK not configured.');
    }

    const parsed = UserDataSchema.parse(userData);
    const { name, email, phone, imageBase64, publicUsername, adminUid: providedAdminUid } = parsed;

    const resolvedAdminUid = (providedAdminUid || '').trim() || await resolveAdminUidByUsernameServer(publicUsername);

    // 1. Upload image to Firebase Storage
    const fileName = `italosantos.com/facial-auth-users/${Date.now()}_${email.replaceAll(/[^a-zA-Z0-9]/g, '_')}.jpg`;
    const file = bucket!.file(fileName);
    const buffer = Buffer.from(imageBase64.split(',')[1], 'base64');

    await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' },
    });
    
    // Make the file public to be read by the AI flow
    await file.makePublic();
    const publicUrl = file.publicUrl();

    // 2. Save user metadata to Realtime Database
    const usersRef = db!.ref('facialAuth/users');
    const newUserRef = usersRef.push(); // Generate a unique ID
    
    await newUserRef.set({
        name,
        email,
        phone,
        imageUrl: publicUrl,
        storagePath: fileName,
        createdAt: new Date().toISOString(),
      ...(resolvedAdminUid ? { adminUid: resolvedAdminUid } : {}),
    });

    console.log(`User ${name} saved successfully with image at ${publicUrl}`);
}

/**
 * Retrieves all registered users from the Realtime Database.
 * @returns An array of user objects.
 */
export async function getAllUsers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    imageUrl: string;
}>> {
    const { isAdminAvailable, db } = getAdminResources();
    
    if (!isAdminAvailable) {
        console.log('[getAllUsers] Admin SDK não disponível. Retornando array vazio.');
        return [];
    }

    const usersRef = db!.ref('facialAuth/users');
    const snapshot = await usersRef.once('value');
    
    if (!snapshot.exists()) {
        console.log("No users found in facialAuth/users path.");
        return [];
    }

    const usersData = snapshot.val();
    const usersList = Object.keys(usersData).map(key => ({
        id: key,
        ...usersData[key],
    }));

    console.log(`Found ${usersList.length} users in the database.`);
    return usersList;
}

/**
 * Saves payment details to the Realtime Database.
 * @param paymentDetails The payment details object.
 * @returns A Promise that resolves when the details are saved.
 */
export async function savePaymentDetails(paymentDetails: PaymentDetails): Promise<void> {
  const { isAdminAvailable, db } = getAdminResources();
  
  if (!isAdminAvailable) {
      console.log('[savePaymentDetails] Admin SDK não disponível. Funcionalidade server-side desabilitada.');
      throw new Error('Server-side functionality not available. Admin SDK not configured.');
  }

  const { paymentId, customerEmail, customerName } = paymentDetails;
  
  const paymentsRef = db!.ref('payments');
  const newPaymentRef = paymentsRef.child(paymentId); // Use paymentId as the key

  await newPaymentRef.set({
    customerEmail,
    customerName,
    paymentDate: new Date().toISOString(),
  });

  console.log(`Payment ${paymentId} for ${customerEmail} saved successfully.`);
}

/**
 * Signs in the user anonymously using Firebase Authentication.
 * @returns A Promise that resolves with the user's UID.
 */
export async function signInAnonymouslyAndGetId(): Promise<string> {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log('User signed in anonymously:', userCredential.user.uid);
    return userCredential.user.uid;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw new Error('Failed to sign in anonymously. Please try again.');
  }
}
