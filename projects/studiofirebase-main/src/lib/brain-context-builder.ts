/**
 * brain-context-builder.ts
 *
 * Monta o contexto completo do Cérebro (brain) para injeção no prompt do Genkit.
 *
 * Ordem de busca (conforme arquitetura recomendada):
 *   1. brain/global      — comportamento base
 *   2. brain/persona     — personalidade do perfil
 *   3. brain/rules       — regras de segurança
 *   4. brain/knowledge   — base de conhecimento (RAG simples por categoria/keyword)
 *   5. brain/conversion  — estágios de conversão
 *   6. brain/objections  — respostas a objeções
 *
 * Também suporta personalização por usuário via /users/{uid}/brain_custom e
 * por perfil via /profiles/{profileId}/brain.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BrainGlobalItem {
  id: string;
  type: string;
  value: string;
  priority: number;
}

export interface BrainPersonaItem {
  id: string;
  field: string;
  content: string;
  visibility: 'public' | 'internal';
}

export interface BrainConversionItem {
  id: string;
  stage: string;
  trigger_examples: string[];
  best_response: string;
  conversion_rate: number;
}

export interface BrainObjectionItem {
  id: string;
  type: string;
  trigger: string[];
  strategy: string;
  response: string;
}

export interface BrainRuleItem {
  id: string;
  type: string;
  description: string;
}

export interface KnowledgeItem {
  id: string;
  content: string;
  category: string;
  priority: number;
}

export interface BrainContext {
  rules: BrainRuleItem[];
  persona: string;
  globalStyle: string;
  knowledge: KnowledgeItem[];
  conversionStage: string | null;
  objectionResponse: string | null;
  userInput: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectConversionStage(
  input: string,
  conversionItems: BrainConversionItem[]
): { stage: string; best_response: string } | null {
  const lower = input.toLowerCase();
  for (const item of conversionItems) {
    const matched = item.trigger_examples.some((t) => lower.includes(t.toLowerCase()));
    if (matched) {
      return { stage: item.stage, best_response: item.best_response };
    }
  }
  return null;
}

function detectObjection(
  input: string,
  objectionItems: BrainObjectionItem[]
): string | null {
  const lower = input.toLowerCase();
  for (const item of objectionItems) {
    const matched = item.trigger.some((t) => lower.includes(t.toLowerCase()));
    if (matched) {
      return item.response;
    }
  }
  return null;
}

function scoreKnowledge(input: string, items: KnowledgeItem[]): KnowledgeItem[] {
  const lower = input.toLowerCase();
  const words = lower.split(/\s+/);
  const scored = items.map((item) => {
    const contentLower = item.content.toLowerCase();
    const categoryLower = item.category.toLowerCase();
    const hits = words.filter((w) => contentLower.includes(w) || categoryLower.includes(w)).length;
    return { item, hits };
  });
  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.item.priority - b.item.priority)
    .slice(0, 4)
    .map((s) => s.item);
}

async function fetchSubcollection<T>(collectionPath: string): Promise<T[]> {
  try {
    const col = collection(db, collectionPath);
    const snap = await getDocs(col);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  } catch {
    return [];
  }
}

// ─── Exportação principal ─────────────────────────────────────────────────────

/**
 * Busca todos os dados do brain no Firestore e monta o contexto para o prompt.
 *
 * @param userInput  Mensagem enviada pelo usuário
 * @param uid        UID do usuário autenticado (opcional, para customização)
 * @param profileId  ID do perfil (opcional, para isolamento multi-perfil)
 */
export async function buildBrainContext(
  userInput: string,
  uid?: string,
  profileId?: string
): Promise<BrainContext> {
  const basePath = profileId ? `profiles/${profileId}/brain` : 'brain';

  const [globalItems, personaItems, ruleItems, knowledgeItems, conversionItems, objectionItems] =
    await Promise.all([
      fetchSubcollection<BrainGlobalItem>(`${basePath}/global/items`),
      fetchSubcollection<BrainPersonaItem>(`${basePath}/persona/items`),
      fetchSubcollection<BrainRuleItem>(`${basePath}/rules/items`),
      fetchSubcollection<KnowledgeItem>(`${basePath}/knowledge/items`),
      fetchSubcollection<BrainConversionItem>(`${basePath}/conversion/items`),
      fetchSubcollection<BrainObjectionItem>(`${basePath}/objections/items`),
    ]);

  // Estilo global ordenado por prioridade
  const sortedGlobal = [...globalItems].sort((a, b) => a.priority - b.priority);
  const globalStyle = sortedGlobal.map((g) => g.value).join(' ');

  // Persona (apenas campos visíveis internamente)
  const personaText = personaItems.map((p) => `${p.field}: ${p.content}`).join('\n');

  // RAG simples: conhecimentos mais relevantes para o input
  const relevantKnowledge =
    knowledgeItems.length > 0
      ? scoreKnowledge(userInput, knowledgeItems)
      : knowledgeItems.slice(0, 4);

  // Detecção de estágio e objeção
  const stageMatch = detectConversionStage(userInput, conversionItems);
  const objectionResponse = detectObjection(userInput, objectionItems);

  return {
    rules: ruleItems,
    persona: personaText,
    globalStyle,
    knowledge: relevantKnowledge,
    conversionStage: stageMatch?.stage ?? null,
    objectionResponse,
    userInput,
  };
}

/**
 * Serializa o BrainContext em um bloco de texto para injeção no system prompt.
 */
export function serializeBrainContext(ctx: BrainContext): string {
  const parts: string[] = [];

  if (ctx.globalStyle) {
    parts.push(`[ESTILO DE COMUNICAÇÃO]\n${ctx.globalStyle}`);
  }

  if (ctx.persona) {
    parts.push(`[PERSONA]\n${ctx.persona}`);
  }

  if (ctx.rules.length > 0) {
    const rulesText = ctx.rules.map((r) => `- ${r.description}`).join('\n');
    parts.push(`[REGRAS OBRIGATÓRIAS]\n${rulesText}`);
  }

  if (ctx.knowledge.length > 0) {
    const kbText = ctx.knowledge.map((k) => `- ${k.content}`).join('\n');
    parts.push(`[BASE DE CONHECIMENTO RELEVANTE]\n${kbText}`);
  }

  if (ctx.conversionStage) {
    parts.push(`[ESTÁGIO DA CONVERSA]\n${ctx.conversionStage}`);
  }

  if (ctx.objectionResponse) {
    parts.push(`[RESPOSTA SUGERIDA PARA OBJEÇÃO]\n${ctx.objectionResponse}`);
  }

  return parts.join('\n\n');
}
