/**
 * Implementação alternativa para buscar dados do Twitter/X
 * Usado como fallback quando APIs principais falharem
 */

// Interface para output de mídia do Twitter
export interface TwitterMediaOutput {
    tweets: Array<{
        id: string;
        text: string;
        media: Array<{
            media_key: string;
            type: 'photo' | 'video' | 'animated_gif';
            url: string;
            preview_image_url?: string;
            variants?: any;
        }>;
        created_at?: string;
        username: string;
        profile_image_url?: string;
        isRetweet?: boolean;
        widget_html?: string;
    }>;
    totalCount: number;
    source: string;
}

// Interface para configurações de Nitter
interface NitterInstance {
    url: string;
    name: string;
}

// Lista de instâncias Nitter públicas confiáveis
const NITTER_INSTANCES: NitterInstance[] = [
    { url: 'https://nitter.poast.org', name: 'Poast' },
    { url: 'https://nitter.privacydev.net', name: 'PrivacyDev' },
    { url: 'https://nitter.unixfox.eu', name: 'UnixFox' },
    { url: 'https://nitter.fdn.fr', name: 'FDN' },
    { url: 'https://nitter.1d4.us', name: '1d4' }
];

/**
 * Buscar dados do Twitter via Nitter (scraping)
 */
async function fetchFromNitter(username: string, mediaType: 'photos' | 'videos' | 'all'): Promise<TwitterMediaOutput> {
    console.log(`Tentando buscar dados via Nitter para @${username}`);
    
    for (const instance of NITTER_INSTANCES) {
        try {
            const url = `${instance.url}/${username}`;
            console.log(`Tentando instância Nitter: ${instance.name} - ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                },
                signal: AbortSignal.timeout(10000) // 10 segundos timeout
            });

            if (!response.ok) {
                console.log(`Instância ${instance.name} retornou ${response.status}`);
                continue;
            }

            const html = await response.text();
            
            // Parse básico do HTML para encontrar posts com mídia
            const tweets = parseNitterHTML(html, mediaType, username);
            
            if (tweets.length > 0) {
                console.log(`Sucesso com instância ${instance.name}: ${tweets.length} tweets encontrados`);
                return {
                    tweets,
                    totalCount: tweets.length,
                    source: `Nitter (${instance.name})`
                };
            }
            
        } catch (error) {
            console.log(`Erro na instância ${instance.name}:`, error);
            continue;
        }
    }
    
    return {
        tweets: [],
        totalCount: 0,
        source: 'Nitter (failed all instances)'
    };
}

/**
 * Parse básico do HTML do Nitter para extrair tweets com mídia
 */
function parseNitterHTML(html: string, mediaType: 'photos' | 'videos' | 'all', username: string): any[] {
    const tweets: any[] = [];
    
    try {
        // Regex para encontrar tweets com imagens
        const tweetRegex = /<div class="tweet-content[^>]*>([\s\S]*?)<\/div>/g;
        const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        const videoRegex = /<video[^>]+src="([^"]+)"[^>]*>/g;
        
        let match;
        let tweetId = 1;
        
        while ((match = tweetRegex.exec(html)) !== null && tweets.length < 20) {
            const tweetContent = match[1];
            const media: any[] = [];
            
            // Buscar imagens se solicitado
            if (mediaType === 'photos' || mediaType === 'all') {
                let imageMatch;
                while ((imageMatch = imageRegex.exec(tweetContent)) !== null) {
                    const imageUrl = imageMatch[1];
                    if (imageUrl && !imageUrl.includes('profile_images')) {
                        media.push({
                            media_key: `nitter_image_${tweetId}_${media.length}`,
                            type: 'photo',
                            url: imageUrl.startsWith('http') ? imageUrl : `https://nitter.net${imageUrl}`,
                            preview_image_url: imageUrl.startsWith('http') ? imageUrl : `https://nitter.net${imageUrl}`
                        });
                    }
                }
            }
            
            // Buscar vídeos se solicitado
            if (mediaType === 'videos' || mediaType === 'all') {
                let videoMatch;
                while ((videoMatch = videoRegex.exec(tweetContent)) !== null) {
                    const videoUrl = videoMatch[1];
                    if (videoUrl) {
                        media.push({
                            media_key: `nitter_video_${tweetId}_${media.length}`,
                            type: 'video',
                            url: videoUrl.startsWith('http') ? videoUrl : `https://nitter.net${videoUrl}`,
                            preview_image_url: videoUrl.startsWith('http') ? videoUrl : `https://nitter.net${videoUrl}`
                        });
                    }
                }
            }
            
            if (media.length > 0 || mediaType === 'all') {
                // Extrair texto básico
                const textMatch = tweetContent.match(/<p[^>]*>([\s\S]*?)<\/p>/);
                const text = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '';
                
                // FILTRO: Apenas posts originais (não retweets)
                const isRetweet = tweetContent.includes('RT @') || tweetContent.includes('retweeted') || text.startsWith('RT @');
                
                if (!isRetweet) {
                    tweets.push({
                        id: `nitter_${tweetId}`,
                        text: text.substring(0, 280), // Limitar tamanho
                        media,
                        created_at: new Date().toISOString(),
                        username,
                        profile_image_url: '',
                        isRetweet: false
                    });
                }
            }
            
            tweetId++;
        }
        
    } catch (error) {
        console.error('Erro ao fazer parse do HTML do Nitter:', error);
    }
    
    return tweets;
}

/**
 * Fallback usando widget embed do Twitter
 * Retorna HTML que pode ser usado no frontend
 */
function getTwitterWidgetHTML(username: string): string {
    return `
    <a class="twitter-timeline" 
       href="https://twitter.com/${username}?ref_src=twsrc%5Etfw"
       data-tweet-limit="20"
       data-chrome="noheader nofooter noborders transparent noscrollbar"
       data-theme="dark">
       Tweets by @${username}
    </a>
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    `;
}

/**
 * Função principal para buscar dados do Twitter usando métodos alternativos
 */
export async function fetchTwitterMediaAlternative(
    username: string, 
    mediaType: 'photos' | 'videos' | 'all' = 'all'
): Promise<TwitterMediaOutput> {
    console.log(`Iniciando busca alternativa para @${username} (tipo: ${mediaType})`);
    
    try {
        // Tentar Nitter primeiro
        const nitterResult = await fetchFromNitter(username, mediaType);
        if (nitterResult.tweets.length > 0) {
            return nitterResult;
        }
        
        // Se Nitter falhar, retornar widget como fallback
        console.log('Nitter falhou, retornando widget como fallback');
        return {
            tweets: [{
                id: 'widget_fallback',
                text: `Widget do Twitter para @${username}`,
                media: [],
                created_at: new Date().toISOString(),
                username,
                profile_image_url: '',
                isRetweet: false,
                widget_html: getTwitterWidgetHTML(username)
            }],
            totalCount: 1,
            source: 'Twitter Widget (fallback)'
        };
        
    } catch (error) {
        console.error('Erro em métodos alternativos:', error);
        
        // Último recurso: widget
        return {
            tweets: [{
                id: 'widget_emergency',
                text: `Widget de emergência para @${username}`,
                media: [],
                created_at: new Date().toISOString(),
                username,
                profile_image_url: '',
                isRetweet: false,
                widget_html: getTwitterWidgetHTML(username)
            }],
            totalCount: 1,
            source: 'Twitter Widget (emergency)'
        };
    }
}

/**
 * Função para validar se um username é válido
 */
export function isValidTwitterUsername(username: string): boolean {
    const cleanUsername = username.replace('@', '');
    return /^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername);
}

/**
 * Função para limpar e normalizar username
 */
export function normalizeUsername(username: string): string {
    return username.replace('@', '').toLowerCase().trim();
}