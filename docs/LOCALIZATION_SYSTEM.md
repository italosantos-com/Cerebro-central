# Smart Localization & Currency System

## Visão Geral

O antigo widget do Google Translate foi substituído por um sistema interno focado em performance e privacidade. Agora o botão 🌐 do header ativa um fluxo que:

1. Usa **Genkit + Gemini** para traduzir apenas os textos críticos (CTA, botões, selo de segurança etc.).
2. Faz **conversão de moeda** automática (câmbio) com o fluxo `convertCurrencyFlow`, exibindo o valor aproximado na moeda do idioma selecionado.
3. Persiste a preferência de idioma/câmbio no `localStorage`, garantindo a mesma experiência ao voltar para o site.

## Componentes Principais

| Arquivo | Função |
| --- | --- |
| `src/contexts/LocalizationContext.tsx` | Provider React que orquestra traduções, câmbio e estado global. |
| `src/components/common/GoogleTranslate.tsx` | Dropdown da UI que consome o contexto, mostra idiomas disponíveis e prévia da tradução/câmbio. |
| `src/components/common/LocalizedText.tsx` | Componente utilitário usado nas páginas para renderizar textos reativos ao idioma atual. |
| `src/app/api/localization/route.ts` | API route que chama `translateText` + `convertCurrency` e devolve traduções + valores convertidos. |
| `src/localization/entries.ts` | Lista canônica dos textos que serão traduzidos automaticamente. |

## Como Funciona

1. O `LocalizationProvider` injeta o contexto logo após os providers de autenticação (ver `ConditionalProviders`).
2. Ao abrir o dropdown e escolher um idioma, o componente chama `changeLanguage()` do contexto.
3. O contexto envia um POST para `/api/localization` com os textos base e o valor BRL atual (carregado das settings do admin via `useSubscriptionSettings`).
4. A resposta chega com as traduções + valor convertido. Tudo é armazenado no contexto e no `localStorage` (`studio.localization.preferences.v1`).
5. Componentes que usam `LocalizedText` re-renderizam automaticamente com o texto traduzido. A seção de preço mostra também o câmbio aproximado (`≈ $19.80 USD`, por exemplo).

## Adicionando Novos Textos

1. Adicione o texto padrão em `src/localization/entries.ts` com um `id` único.
2. Utilize `<LocalizedText id="seu.id" defaultText="Texto original" />` na UI.
3. (Opcional) Atualize `LOCALIZATION_ENTRIES` para manter a descrição do texto.
4. Nenhum passo extra é necessário: o contexto já enviará o novo texto para tradução automaticamente.

## Boas Práticas

- 🧠 **Evite textos gigantes**: traduza frases curtas e objetivas para reduzir custo e latência.
- ♻️ **Reaproveite IDs**: use o mesmo `id` sempre que precisar do mesmo texto em locais diferentes.
- 💾 **Fallback seguro**: se a API falhar, o sistema volta para o português e mantém BRL.
- 🧪 **Teste em dev**: verifique o painel do navegador para garantir que `/api/localization` recebeu 200 OK.

## Troubleshooting

| Sintoma | Correção |
| --- | --- |
| Dropdown mostra erro em vermelho | Verifique a chave `GEMINI_API_KEY` e o log do route `/api/localization`. |
| Valor convertido não aparece | O idioma atual provavelmente é `pt`. Escolha outro idioma para acionar o câmbio. |
| Traduções não atualizam após trocar o valor da assinatura | Altere o valor no admin e recarregue: o provider detecta e recalcula automaticamente. |

## Próximos Passos

- Adicionar mais textos na lista de `entries.ts`.
- Usar o mesmo contexto para páginas internas (assinante, modais etc.).
- Opcional: expor uma API `GET /api/localization/cache` para depuração.

---

**Data:** 16/11/2025  
**Responsável:** Equipe StudioFirebase
