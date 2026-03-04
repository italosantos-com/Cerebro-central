/**
 * ✅ SOLUÇÃO: Protected Translation Service
 * 
 * Este serviço protege elementos estruturais de serem traduzidos
 * enquanto permite tradução segura de conteúdo de usuário.
 * 
 * Evita o "contorcimento" de texto nas páginas.
 */

// Palavras-chave que NÃO devem ser traduzidas
const PROTECTED_PATTERNS = [
    // UI Components
    /^(Button|Modal|Dialog|Sidebar|Header|Footer|Input)$/i,
    /^(Click|Cancel|Close|Submit|Send|Save|Delete)$/i,
    /^(Loading|Error|Success|Warning)$/i,
    
    // HTML/JSX
    /^(className|onClick|onChange|onSubmit|aria-)$/i,
    /^(flex|gap-|p-|m-|h-|w-|bg-|text-)$/i,
    
    // Identifiers
    /^(messageId|chatId|userId|postId|commentId)$/i,
    /^(msg-|chat-|user-|post-|cmt-)$/i,
    
    // URLs/Links
    /^(https?:\/\/|www\.|\.com|\.br|\.org).*$/i,
    
    // Números/Timestamps
    /^\d+$/,
    /^\d{4}-\d{2}-\d{2}.*$/,
    
    // Propriedades técnicas
    /^(node_modules|src|dist|build).*$/i,
    /\.(tsx?|jsx?|json|yaml|yml)$/i,
];

// Padrões de conteúdo que PODEM ser traduzidos (whitelist)
const TRANSLATABLE_PATTERNS = [
    // Mensagens de chat
    /^message:|^msg:/i,
    
    // Comentários de usuário
    /^comment:|^review:/i,
    
    // Descrições
    /^description:|^bio:|^title:|^caption:/i,
    
    // Conteúdo de feed
    /^content:|^text:/i,
    
    // Feedback de usuário
    /^feedback:|^support:/i,
];

/**
 * Verifica se um elemento deve ser protegido de tradução
 */
export function isProtected(text: string, key?: string): boolean {
    // Verificar por padrão de chave
    if (key) {
        for (const pattern of PROTECTED_PATTERNS) {
            if (pattern.test(key)) return true;
        }
    }
    
    // Verificar por padrão de conteúdo
    for (const pattern of PROTECTED_PATTERNS) {
        if (pattern.test(text)) return true;
    }
    
    return false;
}

/**
 * Limpa resposta de tradução de conteúdo potencialmente problemático
 */
export function sanitizeTranslation(translated: string): string {
    if (!translated) return '';
    
    // Remover HTML tags injetadas
    translated = translated.replace(/<[^>]*>/g, '');
    
    // Normalizar espaços
    translated = translated.replace(/\s+/g, ' ').trim();
    
    // Remover caracteres de controle
    translated = translated.replace(/[\x00-\x1F\x7F]/g, '');
    
    return translated;
}

/**
 * Traduz apenas conteúdo seguro, protegendo UI elements
 */
export async function safeTranslate(
    text: string,
    targetLang: string,
    apiKey: string,
    context?: { messageId?: string; userId?: string; type?: string }
): Promise<string> {
    // Verificar se deve ser protegido
    if (isProtected(text, context?.type)) {
        console.log('🛡️ Texto protegido de tradução:', text);
        return text;
    }
    
    try {
        // Chamar Google Translate API
        const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                target_language: targetLang,
                key: apiKey,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        const translated = data.data?.translations?.[0]?.translatedText;
        
        if (!translated) {
            throw new Error('No translation returned');
        }
        
        // Sanitizar resultado
        return sanitizeTranslation(translated);
        
    } catch (error) {
        console.error('❌ Erro ao traduzir:', error);
        // Retornar original em caso de erro
        return text;
    }
}

/**
 * Exemplo de uso em componente React
 */
export function useProtectedTranslation(apiKey: string) {
    return {
        async translate(text: string, targetLang: string = 'pt-BR') {
            return safeTranslate(text, targetLang, apiKey);
        },
        
        isProtected(text: string, key?: string) {
            return isProtected(text, key);
        },
        
        async translateArray(items: string[], targetLang: string = 'pt-BR') {
            return Promise.all(
                items.map(item => safeTranslate(item, targetLang, apiKey))
            );
        },
    };
}

/**
 * EXEMPLO: Como usar em um componente
 * 
 * ```tsx
 * import { useProtectedTranslation } from '@/lib/protected-translation';
 * 
 * export function ChatMessage({ message }: Props) {
 *   const { translate, isProtected } = useProtectedTranslation(
 *     process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY
 *   );
 *   
 *   const [translated, setTranslated] = useState('');
 *   
 *   const handleTranslate = async () => {
 *     if (isProtected(message.text, 'message-content')) {
 *       return; // Não traduzir
 *     }
 *     
 *     const result = await translate(message.text, 'pt-BR');
 *     setTranslated(result);
 *   };
 *   
 *   return (
 *     <div className="message">
 *       <p>{translated || message.text}</p>
 *       <button onClick={handleTranslate}>Traduzir</button>
 *     </div>
 *   );
 * }
 * ```
 */

export default {
    isProtected,
    sanitizeTranslation,
    safeTranslate,
    useProtectedTranslation,
};
