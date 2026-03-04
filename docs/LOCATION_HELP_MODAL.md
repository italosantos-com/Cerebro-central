# LocationHelpModal

Componente auxiliar para exibir instruções de resolução de problemas de geolocalização dentro do **Chat Secreto**.

## Objetivo
Fornecer ao usuário final um painel rápido de ajuda quando a obtenção de localização falha (permissão negada, GPS desativado, timeout, navegador antigo).

## Caminho
`src/components/secret-chat/LocationHelpModal.tsx`

## API
```ts
interface LocationHelpModalProps {
  show: boolean;      // controla exibição
  onClose: () => void // callback para fechar
}
```

## Uso Básico
```tsx
import { LocationHelpModal } from '@/components/secret-chat/LocationHelpModal';

function SecretChatWidget() {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowHelpModal(true)}>Ajuda localização</button>
      <LocationHelpModal show={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
```

## Integração no Chat Secreto
Dentro de `secret-chat-widget.tsx`, o modal é disparado quando a geolocalização falha e o usuário clica em "Como resolver?" na notificação (toast). Basta manter o estado `showHelpModal` e renderizar `<LocationHelpModal .../>` perto do final do JSX.

## Estrutura Interna
- Cabeçalho com botão de fechar.
- Quatro seções: permissões, configurações, problemas comuns e alternativas.
- Lista de itens pré-definidos; não depende de dados externos.

## Estilização
- Camada de fundo (overlay): `fixed inset-0 bg-black bg-opacity-50 ...`
- Área principal responsiva com altura máxima ~80vh e rolagem interna.
- Cores alinhadas ao tema escuro do widget.

## Acessibilidade
- Foco permanece no modal enquanto aberto (overlay captura cliques). Para foco inicial, pode-se adicionar `autoFocus` no botão fechar se necessário.
- Conteúdo textual simples; pode ser internacionalizado posteriormente usando o sistema de localização (ex: `LocalizedText`).

## Extensões Futuras
- Internacionalização das strings.
- Parametrização dos itens (ex: passar array via props).
- Tracking de eventos (ex: analytics quando usuário abre / fecha).

## Debug / Flags
Nada específico. O modal não depende da flag `NEXT_PUBLIC_DEBUG_SECRET_CHAT`; essa flag controla apenas helpers de geolocalização no widget principal.

## Boas Práticas
- Evitar lógica de negócios dentro do modal.
- Manter estático para renderização rápida.
- Reutilizar em outros fluxos de captura de localização (ex: cadastro de perfil) sem acoplamento ao Chat Secreto.

## Manutenção
Para adicionar novos blocos, insira novo `<Section title="X" items={[...]}/>`.

## Relacionado
- `secret-chat-widget.tsx`: controla estado `showHelpModal`.
- Documentação geral do chat secreto em `docs/README.md` (seção Conversas).
