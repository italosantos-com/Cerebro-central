/**
 * Documentação do Sistema de Chat Isolado
 * 
 * ## Arquitetura
 * 
 * O sistema de chat foi isolado em componentes reutilizáveis com suporte a tradução:
 * 
 * ### Componentes
 * - `ChatMessage.tsx` - Componente individual de mensagem
 * - `ChatContainer.tsx` - Container principal que gerencia a conversa
 * 
 * ### Serviços
 * - `chat-translation.service.ts` - Serviço de tradução de mensagens
 * 
 * ### Hooks
 * - `use-chat-translation.ts` - Hooks para usar tradução
 * 
 * ## Como Usar
 * 
 * ### 1. Integrar ChatContainer em uma página
 * 
 * ```tsx
 * import { ChatContainer } from '@/components/chat/ChatContainer';
 * 
 * export default function ChatPage() {
 *   return (
 *     <ChatContainer
 *       conversationId="conv-123"
 *       messages={messages}
 *       participant={{ name: 'João', avatar: 'url' }}
 *       channel="site"
 *       enableTranslation={true}
 *       onSendMessage={async (text) => {
 *         // Enviar mensagem
 *       }}
 *     />
 *   );
 * }
 * ```
 * 
 * ### 2. Usar o Hook de Tradução
 * 
 * ```tsx
 * import { useChatTranslation } from '@/hooks/use-chat-translation';
 * 
 * export function MyComponent() {
 *   const {
 *     isEnabled,
 *     translateMessage,
 *     updateConfig,
 *   } = useChatTranslation(true, 'pt');
 * 
 *   const handleTranslate = async () => {
 *     const result = await translateMessage('Hello world');
 *     console.log(result?.translated); // Olá mundo
 *   };
 * }
 * ```
 * 
 * ### 3. Configurar Serviço de Tradução
 * 
 * ```tsx
 * import { getChatTranslationService } from '@/services/chat-translation.service';
 * 
 * const service = getChatTranslationService(
 *   {
 *     provider: 'google', // ou 'deepl'
 *     enabled: true,
 *     targetLanguage: 'pt',
 *     cacheTranslations: true,
 *   },
 *   'seu-api-key'
 * );
 * 
 * const result = await service.translate('Olá', undefined, 'en');
 * console.log(result?.translated); // Hello
 * ```
 * 
 * ## Próximas Implementações
 * 
 * - [ ] API endpoint `/api/chat/translate`
 * - [ ] API endpoint `/api/chat/detect-language`
 * - [ ] Suporte a mais idiomas
 * - [ ] Persistência de preferências de tradução
 * - [ ] Integração com detectores de idioma
 * - [ ] Cache Redis para traduções
 * - [ ] UI para histórico de conversas
 */

export const CHAT_SYSTEM_DOCS = 'Sistema de chat isolado com suporte a tradução';
