
'use server';
/**
 * @fileOverview Server-side actions for managing user reviews.
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface Review {
    id: string;
    author: string;
    text: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reply?: {
        author: string;
        text: string;
        isVerified: boolean;
        createdAt: string;
    };
}

// Debug: Log the initialization status
const db = getAdminDb();
const reviewsCollection = db ? db.collection('reviews') : null;

/**
 * Retrieves all reviews from Firestore, ordered by creation date.
 * @returns An array of review objects.
 */
export async function getAllReviews(): Promise<Review[]> {
    if (!reviewsCollection) {
        return [];
    }

    try {
        const snapshot = await reviewsCollection.orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            return [];
        }

        const reviews: Review[] = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                id: doc.id,
                author: data.author,
                text: data.text,
                status: data.status || 'pending',
                // Convert Firestore Timestamp to ISO string
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                reply: data.reply ? {
                    ...data.reply,
                    createdAt: data.reply.createdAt?.toDate ? data.reply.createdAt.toDate().toISOString() : new Date().toISOString(),
                } : undefined
            };
        });

        return reviews;
    } catch (error: unknown) {
        throw new Error("Failed to retrieve reviews from the database.", { cause: error });
    }
}


/**
 * Updates the status of a specific review.
 * @param reviewId The ID of the review to update.
 * @param status The new status ('approved' or 'rejected').
 * @returns A promise that resolves with a success or error message.
 */
export async function updateReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; message: string }> {
    if (!reviewsCollection) {
        return { success: false, message: "Admin SDK não disponível - não é possível atualizar avaliação" };
    }

    try {
        const reviewRef = reviewsCollection.doc(reviewId);
        await reviewRef.update({ status: status });
        const message = `Avaliação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`;
        return { success: true, message };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? `Erro ao atualizar a avaliação: ${error.message}` : 'Erro ao atualizar a avaliação';
        return { success: false, message: errorMessage };
    }
}

/**
 * Deletes a specific review permanently.
 * @param reviewId The ID of the review to delete.
 * @returns A promise that resolves with a success or error message.
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    if (!reviewsCollection) {
        return { success: false, message: "Admin SDK não disponível - não é possível excluir avaliação" };
    }

    try {
        const reviewRef = reviewsCollection.doc(reviewId);

        // Verificar se o documento existe antes de deletar
        const doc = await reviewRef.get();
        if (!doc.exists) {
            return { success: false, message: "Avaliação não encontrada" };
        }

        await reviewRef.delete();
        return { success: true, message: "Avaliação excluída permanentemente com sucesso." };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? `Erro ao excluir a avaliação: ${error.message}` : 'Erro ao excluir a avaliação';
        return { success: false, message: errorMessage };
    }
}

/**
 * Approves all pending reviews at once
 * @returns A promise that resolves with a success or error message.
 */
export async function approveAllPendingReviews(): Promise<{ success: boolean; message: string; count: number }> {
    if (!reviewsCollection) {
        return { success: false, message: "Admin SDK não disponível - não é possível aprovar avaliações", count: 0 };
    }

    try {
        // Get all pending reviews
        const pendingSnapshot = await reviewsCollection.where('status', '==', 'pending').get();

        if (pendingSnapshot.empty) {
            return { success: true, message: "Nenhum review pendente encontrado para aprovar.", count: 0 };
        }

        // Use batch to approve all at once
        const batch = reviewsCollection.firestore.batch();

        pendingSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { status: 'approved' });
        });

        await batch.commit();

        const message = `${pendingSnapshot.size} reviews foram aprovados com sucesso!`;
        return { success: true, message, count: pendingSnapshot.size };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? `Erro ao aprovar reviews em lote: ${error.message}` : 'Erro ao aprovar reviews em lote';
        return { success: false, message: errorMessage, count: 0 };
    }
}

