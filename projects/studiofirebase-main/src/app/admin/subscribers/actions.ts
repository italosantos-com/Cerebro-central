
'use server';
/**
 * @fileOverview Server-side actions for managing registered users (subscribers).
 */

import { getAdminApp, getAdminDb, getAdminRtdb, getAdminBucket } from '@/lib/firebase-admin';

export interface RegisteredUser {
    id: string;
    adminUid?: string;
    name: string;
    email: string;
    phone: string;
    imageUrl: string;
    storagePath: string;
    createdAt: string;
}

async function resolveRequestingAdminScope(requestingAdminUid?: string | null): Promise<{
    adminUid: string | null;
    isMainAdmin: boolean;
}> {
    const adminUid = typeof requestingAdminUid === 'string' && requestingAdminUid.trim()
        ? requestingAdminUid.trim()
        : null;

    if (!adminUid) {
        return { adminUid: null, isMainAdmin: false };
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
        return { adminUid, isMainAdmin: false };
    }

    try {
        const adminSnap = await adminDb.collection('admins').doc(adminUid).get();
        const isMainAdmin = adminSnap.exists && Boolean((adminSnap.data() as any)?.isMainAdmin);
        return { adminUid, isMainAdmin };
    } catch {
        return { adminUid, isMainAdmin: false };
    }
}

const db = getAdminRtdb();
const bucket = getAdminBucket();

/**
 * Retrieves all registered users from the Realtime Database.
 * @returns An array of user objects.
 */
export async function getAllUsers(requestingAdminUid?: string): Promise<RegisteredUser[]> {
    if (!db) {
        console.log("Admin SDK not available - cannot access user data from Realtime Database");
        return [];
    }

    try {
        const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
        const usersRef = db.ref('facialAuth/users');
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

        const scopedUsers = scopedAdminUid && !isMainAdmin
            ? usersList.filter((u: any) => Boolean(u?.adminUid) && u.adminUid === scopedAdminUid)
            : usersList;

        // Sort by creation date, newest first
        scopedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        console.log(`Found ${scopedUsers.length} users in the database.`);
        return scopedUsers as RegisteredUser[];
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

/**
 * Deletes a user from the Realtime Database and their image from Storage.
 * @param {object} payload - The user ID and storage path.
 * @param {string} payload.userId - The ID of the user to delete.
 * @param {string} payload.storagePath - The path to the user's image in Firebase Storage.
 * @returns A promise that resolves with a success or error message.
 */
export async function deleteUser(
    { userId, storagePath }: { userId: string, storagePath: string },
    requestingAdminUid?: string
): Promise<{ success: boolean; message: string }> {
    try {
        if (!db) {
            const errorMessage = "Admin SDK não disponível - não é possível remover assinante do banco de dados";
            console.error(errorMessage);
            return { success: false, message: errorMessage };
        }

        if (!bucket) {
            const errorMessage = "Admin SDK Storage não disponível - não é possível remover arquivos do assinante";
            console.error(errorMessage);
            return { success: false, message: errorMessage };
        }

        const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
        if (scopedAdminUid && !isMainAdmin) {
            const existingSnapshot = await db.ref(`facialAuth/users/${userId}`).once('value');
            const existingData = existingSnapshot.val();
            if (!existingData?.adminUid || existingData.adminUid !== scopedAdminUid) {
                return { success: false, message: 'Sem permissão para remover este assinante' };
            }
        }

        // Delete from Realtime Database
        const userRef = db.ref(`facialAuth/users/${userId}`);
        await userRef.remove();

        // Delete from Storage
        if (storagePath?.startsWith('italosantos.com/')) {
            const fileRef = bucket.file(storagePath);
            await fileRef.delete();
        }

        const message = "Assinante removido com sucesso.";
        console.log(message);
        return { success: true, message };

    } catch (error: any) {
        const errorMessage = `Erro ao remover assinante: ${error.message}`;
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }
}
