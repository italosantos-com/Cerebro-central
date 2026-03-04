
'use server';
/**
 * @fileOverview Server-side actions for the admin dashboard.
 */

import { getAdminApp, getAdminRtdb } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const adminApp = getAdminApp();
const db = getAdminRtdb();
const firestore = adminApp ? getFirestore(adminApp) : null;

// Cache por adminUid para evitar consultas desnecessárias
const statsCache = new Map<string, { data: DashboardStats; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface DashboardStats {
  totalSubscribers: number;
  totalConversations: number;
  totalProducts: number;
  pendingReviews: number;
}

interface TopPage {
  id: string;
  path: string;
  count: number;
}

/**
 * Retrieves statistics for the admin dashboard.
 * @param adminUid - UID do admin para escopo dos dados. Se omitido, retorna stats globais (apenas superadmin).
 * @returns A promise that resolves with the dashboard statistics.
 */
export async function getDashboardStats(adminUid?: string): Promise<DashboardStats> {
  const cacheKey = adminUid || '__global__';

  // Check cache first
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  if (!firestore || !db) {
    console.error('[Dashboard] Firebase Admin SDK not available');
    throw new Error('Firebase Admin SDK não está configurado corretamente');
  }

  try {
    let totalSubscribers = 0;
    let totalConversations = 0;
    let totalProducts = 0;
    let pendingReviews = 0;

    // Get total subscribers from Realtime Database
    try {
      const subscribersRef = db.ref('facialAuth/users');
      const subscribersSnapshot = await subscribersRef.once('value');
      if (subscribersSnapshot.exists()) {
        if (adminUid) {
          // Filtrar assinantes pelo adminUid
          let count = 0;
          subscribersSnapshot.forEach((child: any) => {
            if (child.val()?.adminUid === adminUid) count++;
          });
          totalSubscribers = count;
        } else {
          totalSubscribers = subscribersSnapshot.numChildren();
        }
      }
    } catch (error) {
      console.error("Error counting subscribers:", error);
      totalSubscribers = 0;
    }

    // Get active conversations from Firestore
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      if (adminUid) {
        // Conversas ficam em admins/{adminUid}/conversations
        const convSnap = await firestore
          .collection('admins')
          .doc(adminUid)
          .collection('conversations')
          .count()
          .get();
        totalConversations = convSnap.data().count;
      } else {
        const recentChatsSnapshot = await firestore
          .collection('chats')
          .where('createdAt', '>=', sevenDaysAgo)
          .count()
          .get();
        totalConversations = recentChatsSnapshot.data().count;
        console.log(`Found ${totalConversations} active conversations in the last 7 days`);
      }
    } catch (error) {
      console.error("Error counting active conversations:", error);
      try {
        if (!adminUid) {
          const allChatsSnapshot = await firestore.collection('chats').count().get();
          totalConversations = allChatsSnapshot.data().count;
          console.log(`Fallback: counting all ${totalConversations} chats`);
        }
      } catch (fallbackError) {
        console.error("Error in fallback chat count:", fallbackError);
        totalConversations = 0;
      }
    }

    // Get total products from Firestore
    try {
      const productsQuery = adminUid
        ? firestore.collection('products').where('sellerId', '==', adminUid)
        : firestore.collection('products');
      const productsSnapshot = await productsQuery.count().get();
      totalProducts = productsSnapshot.data().count;
    } catch (error) {
      console.error("Error counting products:", error);
      totalProducts = 0;
    }

    // Get pending reviews from Firestore
    try {
      const reviewsQuery = adminUid
        ? firestore.collection('reviews').where('adminUid', '==', adminUid).where('status', '==', 'pending')
        : firestore.collection('reviews').where('status', '==', 'pending');
      const pendingReviewsSnapshot = await reviewsQuery.count().get();
      pendingReviews = pendingReviewsSnapshot.data().count;
    } catch (error) {
      console.error("Error counting pending reviews:", error);
      pendingReviews = 0;
    }

    const stats = {
      totalSubscribers,
      totalConversations,
      totalProducts,
      pendingReviews,
    };

    // Update cache
    statsCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    return stats;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw new Error("Erro ao buscar estatísticas do dashboard", { cause: error });
  }
}

/**
 * Invalidates the dashboard stats cache
 */
export async function invalidateStatsCache(adminUid?: string): Promise<void> {
  if (adminUid) {
    statsCache.delete(adminUid);
  } else {
    statsCache.clear();
  }
}

/**
 * Retrieves the top 3 most accessed pages from the 'pageViews' collection.
 * @returns A promise that resolves with an array of top pages.
 */
export async function getTopPages(): Promise<TopPage[]> {
    if (!firestore) {
        console.error('[getTopPages] Firebase Admin SDK not available');
        throw new Error('Firebase Admin SDK não está configurado corretamente');
    }

    try {
        const pageViewsRef = firestore.collection('pageViews');
        const q = pageViewsRef.orderBy('count', 'desc').limit(3);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return [];
        }

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            path: doc.data().path,
            count: doc.data().count
        }));
    } catch (error) {
        console.error("Error fetching top pages:", error);
        throw new Error("Erro ao buscar páginas mais acessadas", { cause: error });
    }
}
