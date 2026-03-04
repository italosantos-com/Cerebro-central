'use server';
/**
 * @fileOverview Serviço para salvar fotos do Twitter no Firebase Storage e Firestore
 * @version 1.0 - Sistema de backup permanente de fotos
 */

import { storage, db } from '../lib/firebase';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    listAll,
    getMetadata
} from 'firebase/storage';
import { 
    collection, 
    doc, 
    setDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';

// Interface para foto do Twitter salva
export interface SavedTwitterPhoto {
    id: string;
    tweetId: string;
    username: string;
    originalUrl: string;
    storageUrl: string;
    storagePath: string;
    text: string;
    createdAt: Timestamp;
    savedAt: Timestamp;
    mediaKey: string;
    fileSize: number;
    mimeType: string;
}

// Interface para estatísticas
export interface PhotoStorageStats {
    totalPhotos: number;
    totalSize: number;
    userPhotos: { [username: string]: number };
    recentPhotos: SavedTwitterPhoto[];
}

/**
 * Baixa e salva uma foto do Twitter no Firebase Storage
 */
export async function saveTwitterPhoto(
    tweetId: string,
    username: string,
    photoUrl: string,
    text: string,
    mediaKey: string,
    createdAt?: string
): Promise<SavedTwitterPhoto | null> {
    try {
        console.log(`📸 Salvando foto do tweet ${tweetId} de @${username}`);

        // Verificar se a foto já foi salva
        const existingPhoto = await getPhotoByTweetId(tweetId, mediaKey);
        if (existingPhoto) {
            console.log(`✅ Foto já existe no banco: ${existingPhoto.storageUrl}`);
            return existingPhoto;
        }

        // Baixar a imagem
        console.log(`🔄 Baixando imagem: ${photoUrl}`);
        const response = await fetch(photoUrl);
        if (!response.ok) {
            throw new Error(`Erro ao baixar imagem: ${response.status}`);
        }

        const imageBlob = await response.blob();
        const mimeType = imageBlob.type || 'image/jpeg';
        const fileExtension = mimeType.split('/')[1] || 'jpg';

        // Criar referência no Storage
        const fileName = `${tweetId}_${mediaKey}.${fileExtension}`;
        const storagePath = `twitter-photos/${username}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload para o Firebase Storage
        console.log(`⬆️ Fazendo upload para: ${storagePath}`);
        const uploadResult = await uploadBytes(storageRef, imageBlob);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        // Criar documento no Firestore
        const photoData: SavedTwitterPhoto = {
            id: `${tweetId}_${mediaKey}`,
            tweetId,
            username: username.toLowerCase(),
            originalUrl: photoUrl,
            storageUrl: downloadUrl,
            storagePath,
            text: text || '',
            createdAt: createdAt ? Timestamp.fromDate(new Date(createdAt)) : Timestamp.now(),
            savedAt: Timestamp.now(),
            mediaKey,
            fileSize: imageBlob.size,
            mimeType
        };

        // Salvar no Firestore
        const docRef = doc(db, 'twitter-photos', photoData.id);
        await setDoc(docRef, photoData);

        console.log(`✅ Foto salva com sucesso: ${downloadUrl}`);
        return photoData;

    } catch (error: any) {
        console.error(`❌ Erro ao salvar foto do tweet ${tweetId}:`, error.message);
        return null;
    }
}

/**
 * Verifica se uma foto já foi salva
 */
export async function getPhotoByTweetId(tweetId: string, mediaKey: string): Promise<SavedTwitterPhoto | null> {
    try {
        const photosRef = collection(db, 'twitter-photos');
        const q = query(
            photosRef,
            where('tweetId', '==', tweetId),
            where('mediaKey', '==', mediaKey),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return doc.data() as SavedTwitterPhoto;
        }

        return null;
    } catch (error: any) {
        console.error('Erro ao verificar foto existente:', error.message);
        return null;
    }
}

/**
 * Busca fotos salvas de um usuário
 */
export async function getSavedPhotosFromUser(
    username: string, 
    limitCount: number = 20
): Promise<SavedTwitterPhoto[]> {
    try {
        const photosRef = collection(db, 'twitter-photos');
        const q = query(
            photosRef,
            where('username', '==', username.toLowerCase()),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as SavedTwitterPhoto);

    } catch (error: any) {
        console.error(`Erro ao buscar fotos de @${username}:`, error.message);
        return [];
    }
}

/**
 * Busca todas as fotos salvas (recentes)
 */
export async function getAllSavedPhotos(limitCount: number = 50): Promise<SavedTwitterPhoto[]> {
    try {
        const photosRef = collection(db, 'twitter-photos');
        const q = query(
            photosRef,
            orderBy('savedAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as SavedTwitterPhoto);

    } catch (error: any) {
        console.error('Erro ao buscar todas as fotos:', error.message);
        return [];
    }
}

/**
 * Obtém estatísticas do armazenamento de fotos
 */
export async function getPhotoStorageStats(): Promise<PhotoStorageStats> {
    try {
        const photosRef = collection(db, 'twitter-photos');
        const allPhotos = await getDocs(photosRef);
        
        let totalSize = 0;
        const userPhotos: { [username: string]: number } = {};
        
        allPhotos.docs.forEach(doc => {
            const photo = doc.data() as SavedTwitterPhoto;
            totalSize += photo.fileSize || 0;
            userPhotos[photo.username] = (userPhotos[photo.username] || 0) + 1;
        });

        // Buscar fotos recentes
        const recentPhotos = await getAllSavedPhotos(10);

        return {
            totalPhotos: allPhotos.docs.length,
            totalSize,
            userPhotos,
            recentPhotos
        };

    } catch (error: any) {
        console.error('Erro ao obter estatísticas:', error.message);
        return {
            totalPhotos: 0,
            totalSize: 0,
            userPhotos: {},
            recentPhotos: []
        };
    }
}

/**
 * Salva múltiplas mídias (fotos, vídeos, GIFs) de uma vez
 */
export async function saveMultipleTwitterPhotos(tweets: any[]): Promise<{
    saved: SavedTwitterPhoto[];
    failed: string[];
    skipped: string[];
}> {
    const saved: SavedTwitterPhoto[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    console.log(`📦 Iniciando salvamento de ${tweets.length} tweets com mídia (fotos, vídeos, GIFs)...`);

    for (const tweet of tweets) {
        if (!tweet.media || tweet.media.length === 0) {
            skipped.push(tweet.id);
            continue;
        }

        for (const media of tweet.media) {
            // Suporta fotos, vídeos e GIFs animados
            if ((media.type === 'photo' || media.type === 'video' || media.type === 'animated_gif') && media.url) {
                try {
                    const savedPhoto = await saveTwitterPhoto(
                        tweet.id,
                        tweet.username,
                        media.url,
                        tweet.text,
                        media.media_key,
                        tweet.created_at
                    );

                    if (savedPhoto) {
                        saved.push(savedPhoto);
                    } else {
                        failed.push(`${tweet.id}_${media.media_key}`);
                    }

                    // Delay pequeno para não sobrecarregar
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error: any) {
                    console.error(`Erro ao salvar mídia de ${tweet.id}:`, error.message);
                    failed.push(`${tweet.id}_${media.media_key}`);
                }
            }
        }
    }

    console.log(`✅ Salvamento concluído: ${saved.length} salvas, ${failed.length} falharam, ${skipped.length} puladas`);

    return { saved, failed, skipped };
}
