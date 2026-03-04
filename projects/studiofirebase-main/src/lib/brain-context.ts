/**
 * Brain Context Builder
 *
 * Assembles a structured prompt context from the brain datasets (local JSON or Firestore).
 * Pipeline:
 *   1. Load brain_global  → communication rules
 *   2. Load brain_persona → persona/profile
 *   3. Load brain_rules   → hard security rules
 *   4. RAG: similarity match against embeddings_knowledge
 *   5. Stage detection from brain_conversion
 *   6. Objection detection from brain_objections
 */

import path from 'path';
import fs from 'fs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrainGlobalEntry {
  id: string;
  type: string;
  value: string;
  priority: number;
}

export interface BrainPersonaEntry {
  id: string;
  field: string;
  content: string;
  visibility: string;
}

export interface BrainConversionEntry {
  id: string;
  stage: string;
  trigger_examples: string[];
  best_response: string;
  conversion_rate: number;
}

export interface BrainObjectionEntry {
  id: string;
  type: string;
  trigger: string[];
  strategy: string;
  response: string;
}

export interface BrainRuleEntry {
  id: string;
  type: string;
  description: string;
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  category: string;
  priority: number;
}

export interface BrainContext {
  rules: BrainRuleEntry[];
  persona: string;
  globalStyle: string;
  context: KnowledgeEntry[];
  conversation_stage: string | null;
  best_response: string | null;
  objection: BrainObjectionEntry | null;
}

// ─── Dataset loader (local JSON fallback) ────────────────────────────────────

const DEFAULT_DATASETS_DIR = path.join(process.cwd(), 'datasets');

/** Exposed for testing – allows overriding the datasets directory path. */
export let datasetsDir = DEFAULT_DATASETS_DIR;

/** Override the datasets directory (useful in tests). */
export function setDatasetsDir(dir: string): void {
  datasetsDir = dir;
}

function loadDataset<T>(filename: string): T[] {
  try {
    const filePath = path.join(datasetsDir, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

// ─── Firestore loader (optional – used when adminDb is provided) ──────────────

async function fetchFromFirestore<T>(
  adminDb: FirebaseFirestore.Firestore,
  collection: string
): Promise<T[]> {
  try {
    const snapshot = await adminDb.collection(collection).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
  } catch {
    return [];
  }
}

// ─── Simple keyword-based RAG matching ───────────────────────────────────────

function findRelevantKnowledge(
  userInput: string,
  knowledge: KnowledgeEntry[],
  maxResults = 3
): KnowledgeEntry[] {
  const lower = userInput.toLowerCase();
  const scored = knowledge.map((entry) => {
    const words = entry.content.toLowerCase().split(/\s+/);
    const hits = words.filter((w) => lower.includes(w) && w.length > 3).length;
    // Priority bonus: lower priority number = more important; use inverse
    const priorityBonus = 1 / (entry.priority + 1);
    return { entry, score: hits + priorityBonus };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.entry);
}

// ─── Stage detection ─────────────────────────────────────────────────────────

function detectStage(
  userInput: string,
  conversions: BrainConversionEntry[]
): BrainConversionEntry | null {
  const lower = userInput.toLowerCase();
  for (const entry of conversions) {
    for (const trigger of entry.trigger_examples) {
      if (lower.includes(trigger.toLowerCase())) return entry;
    }
  }
  return null;
}

// ─── Objection detection ─────────────────────────────────────────────────────

function detectObjection(
  userInput: string,
  objections: BrainObjectionEntry[]
): BrainObjectionEntry | null {
  const lower = userInput.toLowerCase();
  for (const entry of objections) {
    for (const trigger of entry.trigger) {
      if (lower.includes(trigger.toLowerCase())) return entry;
    }
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface BuildBrainContextOptions {
  userInput: string;
  /** Optional Firestore Admin instance. Falls back to local JSON datasets when absent. */
  adminDb?: FirebaseFirestore.Firestore;
  /**
   * Optional profile override collection prefix, e.g. "profiles/profileId/brain".
   * When provided, brain data is fetched from `{profilePath}/{section}/entries` in Firestore.
   * Requires `adminDb` to be set; otherwise ignored.
   */
  profilePath?: string;
}

/**
 * Builds the full brain context object for a given user message.
 * Used to assemble the final Genkit/LLM prompt.
 */
export async function buildBrainContext({
  userInput,
  adminDb,
  profilePath,
}: BuildBrainContextOptions): Promise<BrainContext> {
  // Resolve collection prefix: prefer profile-specific path when both adminDb and profilePath are set
  const collectionPrefix = adminDb && profilePath ? profilePath : 'brain';

  // 1. Load datasets (Firestore or local JSON)
  const [globalEntries, personaEntries, ruleEntries, conversionEntries, objectionEntries, knowledgeEntries] =
    await Promise.all([
      adminDb
        ? fetchFromFirestore<BrainGlobalEntry>(adminDb, `${collectionPrefix}/global/entries`)
        : Promise.resolve(loadDataset<BrainGlobalEntry>('brain_global.json')),
      adminDb
        ? fetchFromFirestore<BrainPersonaEntry>(adminDb, `${collectionPrefix}/persona/entries`)
        : Promise.resolve(loadDataset<BrainPersonaEntry>('brain_persona.json')),
      adminDb
        ? fetchFromFirestore<BrainRuleEntry>(adminDb, `${collectionPrefix}/rules/entries`)
        : Promise.resolve(loadDataset<BrainRuleEntry>('brain_rules.json')),
      adminDb
        ? fetchFromFirestore<BrainConversionEntry>(adminDb, `${collectionPrefix}/conversion/entries`)
        : Promise.resolve(loadDataset<BrainConversionEntry>('brain_conversion.json')),
      adminDb
        ? fetchFromFirestore<BrainObjectionEntry>(adminDb, `${collectionPrefix}/objections/entries`)
        : Promise.resolve(loadDataset<BrainObjectionEntry>('brain_objections.json')),
      adminDb
        ? fetchFromFirestore<KnowledgeEntry>(adminDb, `${collectionPrefix}/knowledge/entries`)
        : Promise.resolve(loadDataset<KnowledgeEntry>('embeddings_knowledge.json')),
    ]);

  // 2. Build persona string (public visibility only)
  const personaText = personaEntries
    .filter((p) => p.visibility === 'public')
    .map((p) => p.content)
    .join(' ');

  // 3. Build global communication style (sorted by priority)
  const globalStyle = [...globalEntries]
    .sort((a, b) => a.priority - b.priority)
    .map((g) => g.value)
    .join(' ');

  // 4. RAG: find relevant knowledge entries
  const relevantKnowledge = findRelevantKnowledge(userInput, knowledgeEntries);

  // 5. Stage detection
  const detectedConversion = detectStage(userInput, conversionEntries);

  // 6. Objection detection
  const detectedObjection = detectObjection(userInput, objectionEntries);

  return {
    rules: ruleEntries,
    persona: personaText,
    globalStyle,
    context: relevantKnowledge,
    conversation_stage: detectedConversion?.stage ?? null,
    best_response: detectedConversion?.best_response ?? null,
    objection: detectedObjection,
  };
}

/**
 * Serialises a BrainContext into a system prompt string
 * suitable for injection into a Genkit/LLM call.
 */
export function brainContextToSystemPrompt(ctx: BrainContext): string {
  const lines: string[] = [];

  if (ctx.rules.length > 0) {
    lines.push('REGRAS:');
    ctx.rules.forEach((r) => lines.push(`- ${r.description}`));
  }

  if (ctx.persona) {
    lines.push(`\nPERSONALIDADE: ${ctx.persona}`);
  }

  if (ctx.globalStyle) {
    lines.push(`\nESTILO: ${ctx.globalStyle}`);
  }

  if (ctx.context.length > 0) {
    lines.push('\nCONHECIMENTO RELEVANTE:');
    ctx.context.forEach((k) => lines.push(`- ${k.content}`));
  }

  if (ctx.conversation_stage) {
    lines.push(`\nESTÁGIO DA CONVERSA: ${ctx.conversation_stage}`);
  }

  if (ctx.objection) {
    lines.push(`\nOBJEÇÃO DETECTADA (${ctx.objection.type}): ${ctx.objection.response}`);
  }

  return lines.join('\n');
}
