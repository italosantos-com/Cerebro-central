/**
 * POST /api/brain/chat
 *
 * Pipeline de contexto para o Cérebro IA:
 * 1. Carrega brain_global + persona + rules do Firestore (ou fallback local)
 * 2. Busca similaridade na knowledge base
 * 3. Identifica estágio da conversa
 * 4. Verifica objeções
 * 5. Monta prompt final e chama Genkit
 * 6. Persiste conversa no Firestore para aprendizado
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { centralAssistantBrain } from '@/ai/flows/central-assistant-flow';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrainChatRequest {
  message: string;
  conversationId?: string;
  profileId?: string;
  userId?: string;
}

interface KnowledgeEntry {
  id: string;
  content: string;
  category: string;
  priority: number;
}

interface ConversionEntry {
  id: string;
  stage: string;
  trigger_examples: string[];
  best_response: string;
  conversion_rate: number;
}

interface ObjectionEntry {
  id: string;
  type: string;
  trigger: string[];
  strategy: string;
  response: string;
}

interface BrainEntry {
  id: string;
  [key: string]: unknown;
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

async function fetchCollection<T>(db: Firestore, path: string): Promise<T[]> {
  try {
    const snap = await db.collection(path).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  } catch {
    return [];
  }
}

async function fetchDoc<T>(db: Firestore, path: string): Promise<T[]> {
  try {
    const snap = await db.doc(path).get();
    if (!snap.exists) return [];
    const data = snap.data() as Record<string, T[]>;
    // Support both array-valued doc and sub-collection
    const firstArray = Object.values(data).find(Array.isArray);
    return firstArray ?? [];
  } catch {
    return [];
  }
}

// ─── RAG: keyword similarity (no embedding dependency) ────────────────────────

function similarityScore(query: string, text: string): number {
  const queryTokens = new Set(query.toLowerCase().split(/\s+/));
  const textTokens = text.toLowerCase().split(/\s+/);
  let hits = 0;
  for (const token of textTokens) {
    if (queryTokens.has(token)) hits++;
  }
  return hits / Math.max(queryTokens.size, 1);
}

function findRelevantKnowledge(
  query: string,
  knowledge: KnowledgeEntry[],
  topK = 3
): KnowledgeEntry[] {
  return knowledge
    .map((entry) => ({ entry, score: similarityScore(query, entry.content) }))
    .sort((a, b) => b.score - a.score || a.entry.priority - b.entry.priority)
    .slice(0, topK)
    .map(({ entry }) => entry);
}

// ─── Stage & Objection detection ─────────────────────────────────────────────

function detectStage(
  message: string,
  conversions: ConversionEntry[]
): ConversionEntry | null {
  const lower = message.toLowerCase();
  let best: { entry: ConversionEntry; hits: number } | null = null;
  for (const entry of conversions) {
    const hits = entry.trigger_examples.filter((t) =>
      lower.includes(t.toLowerCase())
    ).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { entry, hits };
    }
  }
  return best?.entry ?? null;
}

function detectObjection(
  message: string,
  objections: ObjectionEntry[]
): ObjectionEntry | null {
  const lower = message.toLowerCase();
  for (const obj of objections) {
    if (obj.trigger.some((t) => lower.includes(t.toLowerCase()))) {
      return obj;
    }
  }
  return null;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildBrainPrompt(params: {
  rules: BrainEntry[];
  persona: BrainEntry[];
  context: KnowledgeEntry[];
  stage: ConversionEntry | null;
  objection: ObjectionEntry | null;
  userInput: string;
}): string {
  const rulesText = params.rules.map((r) => `- ${r.description ?? r.value ?? r.id}`).join('\n');
  const personaText = params.persona
    .map((p) => `${p.field ?? p.type ?? p.id}: ${p.content ?? p.value}`)
    .join('\n');
  const contextText = params.context.map((k) => `[${k.category}] ${k.content}`).join('\n');

  let stageHint = '';
  if (params.stage) {
    stageHint = `\nEstágio identificado: ${params.stage.stage}\nSugestão de resposta: ${params.stage.best_response}`;
  }

  let objectionHint = '';
  if (params.objection) {
    objectionHint = `\nObjeção identificada: ${params.objection.type}\nEstratégia: ${params.objection.strategy}\nResposta sugerida: ${params.objection.response}`;
  }

  return [
    '=== REGRAS ===',
    rulesText,
    '',
    '=== PERSONA ===',
    personaText,
    '',
    '=== CONTEXTO RELEVANTE ===',
    contextText || '(sem contexto específico)',
    stageHint,
    objectionHint,
    '',
    `=== MENSAGEM DO USUÁRIO ===`,
    params.userInput,
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .trim();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: BrainChatRequest = await request.json();
    const { message, conversationId, profileId, userId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Firestore indisponível' }, { status: 503 });
    }

    // ── 1. Load brain layers from Firestore ──────────────────────────────────
    const brainBase = profileId ? `profiles/${profileId}/brain` : 'brain';

    const [globalBrain, persona, rules, knowledge, conversions, objections] =
      await Promise.all([
        fetchCollection<BrainEntry>(db, `${brainBase}/global/entries`).then(
          (r) => (r.length ? r : fetchDoc<BrainEntry>(db, `${brainBase}/global`))
        ),
        fetchCollection<BrainEntry>(db, `${brainBase}/persona/entries`).then(
          (r) => (r.length ? r : fetchDoc<BrainEntry>(db, `${brainBase}/persona`))
        ),
        fetchCollection<BrainEntry>(db, `${brainBase}/rules/entries`).then(
          (r) => (r.length ? r : fetchDoc<BrainEntry>(db, `${brainBase}/rules`))
        ),
        fetchCollection<KnowledgeEntry>(db, `${brainBase}/knowledge/entries`).then(
          (r) => (r.length ? r : fetchDoc<KnowledgeEntry>(db, `${brainBase}/knowledge`))
        ),
        fetchCollection<ConversionEntry>(db, `${brainBase}/conversion/entries`).then(
          (r) => (r.length ? r : fetchDoc<ConversionEntry>(db, `${brainBase}/conversion`))
        ),
        fetchCollection<ObjectionEntry>(db, `${brainBase}/objections/entries`).then(
          (r) => (r.length ? r : fetchDoc<ObjectionEntry>(db, `${brainBase}/objections`))
        ),
      ]);

    // ── 2. RAG: find relevant knowledge ──────────────────────────────────────
    const relevantContext = findRelevantKnowledge(message, knowledge);

    // ── 3. Identify stage & objection ────────────────────────────────────────
    const stage = detectStage(message, conversions);
    const objection = detectObjection(message, objections);

    // ── 4. Build prompt ───────────────────────────────────────────────────────
    const prompt = buildBrainPrompt({
      rules: [...rules, ...globalBrain],
      persona,
      context: relevantContext,
      stage,
      objection,
      userInput: message,
    });

    // ── 5. Call Genkit flow ───────────────────────────────────────────────────
    const answer = await centralAssistantBrain({
      question: prompt,
      userId,
      context: { channel: 'brain-chat' },
    });

    // ── 6. Persist conversation ───────────────────────────────────────────────
    const convRef = conversationId
      ? db.collection('conversations').doc(conversationId)
      : db.collection('conversations').doc();

    await convRef.set(
      {
        uid: userId ?? null,
        stage: stage?.stage ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        messages: FieldValue.arrayUnion(
          { role: 'user', content: message, ts: new Date().toISOString() },
          { role: 'assistant', content: answer, ts: new Date().toISOString() }
        ),
      },
      { merge: true }
    );

    if (!conversationId) {
      await convRef.set(
        { createdAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return NextResponse.json({
      answer,
      conversationId: convRef.id,
      stage: stage?.stage ?? null,
      objection: objection?.type ?? null,
      contextUsed: relevantContext.map((k) => k.id),
    });
  } catch (error: unknown) {
    console.error('[Brain Chat] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/brain/chat',
    description: 'Context builder para o Cérebro IA com RAG sobre datasets do Firestore',
  });
}
