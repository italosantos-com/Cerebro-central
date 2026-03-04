import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { filterPersonalMedia } from '@/lib/twitter-media-filter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        console.log('[HYBRID-VIDEOS] Iniciando busca de vídeos...');

        // Verificar token de autenticação do Firebase
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[HYBRID-VIDEOS] Token não fornecido');
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verificar token do Firebase Admin
        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('[HYBRID-VIDEOS] Firebase Admin não inicializado');
            return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
        }

        const auth = getAuth(adminApp);
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log('[HYBRID-VIDEOS] Usuário autenticado:', uid);

        // Buscar username do Firestore
        const db = getFirestore(adminApp);
        const twitterAdminDoc = await db.collection('twitter_admins').doc(uid).get();

        if (!twitterAdminDoc.exists) {
            console.error('[HYBRID-VIDEOS] Username não encontrado no Firestore');
            return NextResponse.json({ error: 'Usuário não possui Twitter autenticado. Por favor, autentique na página /admin/integrations' }, { status: 404 });
        }

        const userData = twitterAdminDoc.data() as { username: string; twitterUserId?: string };
        const username = userData.username;
        let userId = userData.twitterUserId;

        console.log('[HYBRID-VIDEOS] Username:', username, '| UserID salvo:', userId);

        // Verificar se deve forçar busca da API (ignorar cache)
        const forceRefresh = request.nextUrl.searchParams.get('force') === 'true';

        // Verificar cache no Firestore (apenas se não for forçado)
        if (!forceRefresh) {
            const cacheDoc = await db.collection('twitter_cache').doc(username).collection('media').doc('videos').get();

            if (cacheDoc.exists && cacheDoc.data()?.data) {
                console.log('[HYBRID-VIDEOS] ✅ Retornando cache (válido até logout)');
                return NextResponse.json({
                    success: true,
                    tweets: cacheDoc.data()!.data,
                    cached: true,
                    username: username
                });
            }
        } else {
            console.log('[HYBRID-VIDEOS] 🔄 Forçando atualização (force=true)');
        }

        console.log('[HYBRID-VIDEOS] ⚠️ Cache não encontrado, buscando da API...');

        // Buscar Bearer Token (prioridade: Firestore > .env)
        let bearerToken: string | undefined;

        try {
            const configDoc = await db.collection('twitter_config').doc('bearer_token').get();
            if (configDoc.exists && configDoc.data()?.token) {
                bearerToken = configDoc.data()!.token;
                console.log('[HYBRID-VIDEOS] 🔑 Usando Bearer Token do Firestore');
            }
        } catch (error) {
            console.warn('[HYBRID-VIDEOS] ⚠️ Erro ao buscar token do Firestore:', error);
        }

        // Fallback para .env
        if (!bearerToken) {
            bearerToken = process.env.TWITTER_BEARER_TOKEN;
            console.log('[HYBRID-VIDEOS] 🔑 Usando Bearer Token do .env');
        }

        if (!bearerToken) {
            console.error('[HYBRID-VIDEOS] ❌ Bearer Token não configurado');
            return NextResponse.json({ error: 'Twitter Bearer Token não configurado' }, { status: 500 });
        }

        console.log('[HYBRID-VIDEOS] 🔄 Buscando da API do Twitter...');

        // Se não tiver twitterUserId salvo, buscar da API (apenas uma vez)
        if (!userId) {
            console.log('[HYBRID-VIDEOS] ⚠️ Twitter User ID não salvo, buscando da API...');
            const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                },
            });

            if (!userResponse.ok) {
                console.error('[HYBRID-VIDEOS] ❌ Erro ao buscar usuário:', userResponse.status);
                return NextResponse.json({
                    error: 'Rate limit atingido ou erro ao buscar usuário do Twitter. Aguarde alguns minutos.'
                }, { status: userResponse.status });
            }

            const userDataFromApi = await userResponse.json();
            userId = userDataFromApi.data?.id;

            if (!userId) {
                console.error('[HYBRID-VIDEOS] ❌ ID do usuário não encontrado');
                return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 404 });
            }

            // Salvar o twitterUserId no Firestore para não precisar buscar novamente
            await db.collection('twitter_admins').doc(uid).update({
                twitterUserId: userId
            });
            console.log('[HYBRID-VIDEOS] ✅ Twitter User ID salvo:', userId);
        }

        // Buscar tweets com paginação até ter vídeos suficientes
        // API v2: max_results=100 por página (máximo permitido)
        let allTweetsData: any[] = [];
        let allMediaIncludes: any[] = [];
        let allUsers: any[] = [];
        let paginationToken: string | undefined;
        let requestCount = 0;
        const maxRequests = 1; // TEMPORÁRIO: 1 requisição (100 tweets) - Rate limit atingido!
        
        console.log('[HYBRID-VIDEOS] 🔄 Buscando tweets com paginação...');

        do {
            requestCount++;
            const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
            url.searchParams.set('max_results', '100');
            url.searchParams.set('exclude', 'retweets,replies');
            url.searchParams.set('expansions', 'attachments.media_keys,author_id');
            url.searchParams.set('tweet.fields', 'created_at,text,public_metrics');
            url.searchParams.set('media.fields', 'url,preview_image_url,type,media_key,width,height,alt_text,variants');
            url.searchParams.set('user.fields', 'profile_image_url,username');
            
            if (paginationToken) {
                url.searchParams.set('pagination_token', paginationToken);
            }

            console.log(`[HYBRID-VIDEOS] 📡 Requisição ${requestCount}/${maxRequests}...`);

            const tweetsResponse = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                },
            });

            if (!tweetsResponse.ok) {
                console.error('[HYBRID-VIDEOS] Erro ao buscar tweets:', tweetsResponse.status);
                return NextResponse.json({ error: 'Erro ao buscar tweets' }, { status: tweetsResponse.status });
            }

            const tweetsData = await tweetsResponse.json();
            
            // Acumular dados de todas as requisições
            if (tweetsData.data && tweetsData.data.length > 0) {
                allTweetsData.push(...tweetsData.data);
                console.log(`[HYBRID-VIDEOS] ✅ ${tweetsData.data.length} tweets obtidos nesta página`);
            }
            
            if (tweetsData.includes?.media) {
                allMediaIncludes.push(...tweetsData.includes.media);
            }
            
            if (tweetsData.includes?.users) {
                allUsers.push(...tweetsData.includes.users);
            }
            
            // Verificar se há próxima página
            paginationToken = tweetsData.meta?.next_token;
            
            if (!paginationToken) {
                console.log('[HYBRID-VIDEOS] ℹ️ Não há mais páginas disponíveis');
                break;
            }
            
        } while (paginationToken && requestCount < maxRequests);

        console.log(`[HYBRID-VIDEOS] 📊 Total acumulado: ${allTweetsData.length} tweets, ${allMediaIncludes.length} mídias`);

        type TwitterUser = { id: string; username?: string; profile_image_url?: string };
        const userMap = new Map<string, TwitterUser>(
            allUsers.map((u: any) => [u.id, { id: u.id, username: u.username, profile_image_url: u.profile_image_url }])
        );

        // Preparar todos os tweets com mídia para análise do Gemini
        const allTweetsWithMedia = allTweetsData.map((tweet: any) => {
            const author = userMap.get(tweet.author_id);
            return {
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                username: author?.username || 'unknown',
                profile_image_url: author?.profile_image_url || '',
                media: (tweet.attachments?.media_keys || []).map((key: string) => {
                    return allMediaIncludes.find((m: any) => m.media_key === key);
                }).filter(Boolean),
            };
        }).filter((tweet: any) => tweet.media.length > 0);

        console.log('[HYBRID-VIDEOS] 📊 Total de tweets com mídia:', allTweetsWithMedia.length);

        // Usar Gemini para filtrar inteligentemente 25 vídeos pessoais
        console.log('[HYBRID-VIDEOS] 🤖 Usando Gemini para filtrar vídeos pessoais...');
        const { videos, reasoning } = await filterPersonalMedia(allTweetsWithMedia, username);

        console.log('[HYBRID-VIDEOS] ✅ Gemini filtrou', videos.length, 'vídeos pessoais');
        console.log('[HYBRID-VIDEOS] 💡 Raciocínio:', reasoning);

        // Salvar cache no Firestore (vídeos filtrados pelo Gemini)
        const tweetsToCache = videos;
        await db.collection('twitter_cache').doc(username).collection('media').doc('videos').set({
            data: tweetsToCache,
            timestamp: new Date().toISOString(),
        });

        console.log('[HYBRID-VIDEOS] Cache salvo no Firestore');

        return NextResponse.json({
            success: true,
            tweets: tweetsToCache,
            cached: false,
            username: username
        });

    } catch (error) {
        console.error('[HYBRID-VIDEOS] Erro:', error);
        return NextResponse.json({
            success: false,
            error: 'Erro ao buscar vídeos',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}