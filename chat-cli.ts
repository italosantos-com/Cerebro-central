import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatStore {
  activeConversationId: string;
  conversations: Conversation[];
}

interface LearningExample {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

interface LearningStore {
  updatedAt: string;
  examples: LearningExample[];
}

interface OfflineExport {
  version: number;
  exportedAt: string;
  chatStore: ChatStore;
  learningStore: LearningStore;
}

interface RankedLearningEntry {
  example: LearningExample;
  tokenSet: Set<string>;
}

interface LearningRuntimeIndex {
  entries: RankedLearningEntry[];
  tokenFrequency: Map<string, number>;
  totalEntries: number;
}

const STORE_PATH = path.resolve(process.cwd(), "conversations.json");
const LEARNING_PATH = path.resolve(process.cwd(), "learning.json");
const DEFAULT_MODEL = process.argv[2] || "mistral";

async function ensureStoreFile(): Promise<void> {
  try {
    await access(STORE_PATH, fsConstants.F_OK);
  } catch {
    const initialConversation = createConversation("Conversa 1", DEFAULT_MODEL);
    const initialStore: ChatStore = {
      activeConversationId: initialConversation.id,
      conversations: [initialConversation],
    };
    await saveStore(initialStore);
  }
}

async function ensureLearningFile(): Promise<void> {
  try {
    await access(LEARNING_PATH, fsConstants.F_OK);
  } catch {
    const initialLearningStore: LearningStore = {
      updatedAt: new Date().toISOString(),
      examples: [],
    };
    await saveLearningStore(initialLearningStore);
  }
}

function createConversation(title: string, model: string): Conversation {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title,
    model,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

async function loadStore(): Promise<ChatStore> {
  await ensureStoreFile();
  const data = await readFile(STORE_PATH, "utf8");
  return JSON.parse(data) as ChatStore;
}

async function saveStore(store: ChatStore): Promise<void> {
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function loadLearningStore(): Promise<LearningStore> {
  await ensureLearningFile();
  const data = await readFile(LEARNING_PATH, "utf8");
  return JSON.parse(data) as LearningStore;
}

async function saveLearningStore(store: LearningStore): Promise<void> {
  await writeFile(LEARNING_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getActiveConversation(store: ChatStore): Conversation {
  let active = store.conversations.find((conv) => conv.id === store.activeConversationId);

  if (!active) {
    active = store.conversations[0];
    store.activeConversationId = active.id;
  }

  return active;
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function buildLearningIndex(learningStore: LearningStore): LearningRuntimeIndex {
  const tokenFrequency = new Map<string, number>();
  const entries: RankedLearningEntry[] = learningStore.examples.map((example) => {
    const tokenSet = new Set(normalizeTokens(`${example.question} ${example.answer}`));
    for (const token of tokenSet) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
    return { example, tokenSet };
  });

  return {
    entries,
    tokenFrequency,
    totalEntries: Math.max(entries.length, 1),
  };
}

function rankLearnedExamples(userMessage: string, learningStore: LearningStore, maxResults = 4): LearningExample[] {
  const messageTokens = new Set(normalizeTokens(userMessage));
  if (!messageTokens.size) {
    return [];
  }

  return learningStore.examples
    .map((example) => {
      const exampleTokens = new Set(normalizeTokens(`${example.question} ${example.answer}`));
      let overlap = 0;
      for (const token of messageTokens) {
        if (exampleTokens.has(token)) {
          overlap += 1;
        }
      }
      return { example, score: overlap };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => entry.example);
}

function rankLearnedExamplesFast(userMessage: string, index: LearningRuntimeIndex, maxResults = 5): LearningExample[] {
  const messageTokens = Array.from(new Set(normalizeTokens(userMessage)));
  if (!messageTokens.length) {
    return [];
  }

  const ranked = index.entries
    .map((entry) => {
      let weightedOverlap = 0;
      let overlapCount = 0;

      for (const token of messageTokens) {
        if (!entry.tokenSet.has(token)) {
          continue;
        }

        overlapCount += 1;
        const freq = index.tokenFrequency.get(token) ?? 1;
        const rarityWeight = Math.log2(1 + index.totalEntries / freq);
        weightedOverlap += rarityWeight;
      }

      const questionTokens = new Set(normalizeTokens(entry.example.question));
      let questionOverlap = 0;
      for (const token of messageTokens) {
        if (questionTokens.has(token)) {
          questionOverlap += 1;
        }
      }

      const questionBoost = questionOverlap * 0.35;
      const coverageBoost = overlapCount / Math.max(messageTokens.length, 1);
      const score = weightedOverlap + questionBoost + coverageBoost;

      return { example: entry.example, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => entry.example);

  return ranked;
}

function parseJsonExamples(raw: string): Array<{ question: string; answer: string }> {
  const parsed = JSON.parse(raw) as unknown;

  const toPair = (item: unknown): { question: string; answer: string } | null => {
    const typed = item as { question?: unknown; answer?: unknown };
    if (typeof typed?.question === "string" && typeof typed?.answer === "string") {
      const question = typed.question.trim();
      const answer = typed.answer.trim();
      if (question && answer) {
        return { question, answer };
      }
    }
    return null;
  };

  if (Array.isArray(parsed)) {
    return parsed.map(toPair).filter((item): item is { question: string; answer: string } => item !== null);
  }

  const objectParsed = parsed as { examples?: unknown };
  if (Array.isArray(objectParsed.examples)) {
    return objectParsed.examples.map(toPair).filter((item): item is { question: string; answer: string } => item !== null);
  }

  return [];
}

function parseJsonlExamples(raw: string): Array<{ question: string; answer: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: Array<{ question: string; answer: string }> = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { question?: unknown; answer?: unknown };
      if (typeof parsed.question === "string" && typeof parsed.answer === "string") {
        const question = parsed.question.trim();
        const answer = parsed.answer.trim();
        if (question && answer) {
          results.push({ question, answer });
        }
      }
    } catch {
      // Ignore malformed lines
    }
  }
  return results;
}

function parseCsvExamples(raw: string): Array<{ question: string; answer: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const results: Array<{ question: string; answer: string }> = [];
  const maybeHeader = lines[0].toLowerCase().replace(/"/g, "");
  const startIndex = maybeHeader.includes("question") && maybeHeader.includes("answer") ? 1 : 0;

  for (const line of lines.slice(startIndex)) {
    const columns = line.split(",");
    if (columns.length < 2) {
      continue;
    }
    const question = columns[0].replace(/^"|"$/g, "").trim();
    const answer = columns.slice(1).join(",").replace(/^"|"$/g, "").trim();
    if (question && answer) {
      results.push({ question, answer });
    }
  }

  return results;
}

function parseTextExamples(raw: string): Array<{ question: string; answer: string }> {
  const blocks = raw
    .split(/\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const results: Array<{ question: string; answer: string }> = [];
  for (const block of blocks) {
    const qMatch = block.match(/(?:^|\n)q(?:uestion)?\s*:\s*([\s\S]*?)(?:\n(?:a(?:nswer)?\s*:)|$)/i);
    const aMatch = block.match(/(?:^|\n)a(?:nswer)?\s*:\s*([\s\S]*)$/i);
    if (qMatch && aMatch) {
      const question = qMatch[1].trim();
      const answer = aMatch[1].trim();
      if (question && answer) {
        results.push({ question, answer });
      }
    }
  }

  if (results.length) {
    return results;
  }

  const linePairs = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("=>");
      if (parts.length < 2) {
        return null;
      }
      const question = parts[0].trim();
      const answer = parts.slice(1).join("=>").trim();
      if (!question || !answer) {
        return null;
      }
      return { question, answer };
    })
    .filter((item): item is { question: string; answer: string } => item !== null);

  return linePairs;
}

async function importLearningFile(fileName: string, learningStore: LearningStore): Promise<number> {
  const targetPath = path.resolve(process.cwd(), fileName.trim());
  const extension = path.extname(targetPath).toLowerCase();
  const raw = await readFile(targetPath, "utf8");

  let parsedExamples: Array<{ question: string; answer: string }> = [];

  if (extension === ".json") {
    parsedExamples = parseJsonExamples(raw);
  } else if (extension === ".jsonl") {
    parsedExamples = parseJsonlExamples(raw);
  } else if (extension === ".csv") {
    parsedExamples = parseCsvExamples(raw);
  } else if (extension === ".txt" || extension === ".md") {
    parsedExamples = parseTextExamples(raw);
  } else {
    throw new Error("Formato não suportado. Use .json, .jsonl, .csv, .txt ou .md");
  }

  if (!parsedExamples.length) {
    throw new Error("Nenhum par pergunta/resposta válido encontrado no arquivo.");
  }

  const existingKey = new Set(
    learningStore.examples.map((example) => `${example.question.toLowerCase()}::${example.answer.toLowerCase()}`)
  );

  let inserted = 0;
  for (const example of parsedExamples) {
    const key = `${example.question.toLowerCase()}::${example.answer.toLowerCase()}`;
    if (existingKey.has(key)) {
      continue;
    }
    learningStore.examples.unshift({
      id: randomUUID(),
      question: example.question,
      answer: example.answer,
      createdAt: new Date().toISOString(),
    });
    existingKey.add(key);
    inserted += 1;
  }

  learningStore.updatedAt = new Date().toISOString();
  await saveLearningStore(learningStore);
  return inserted;
}

function buildPrompt(conversation: Conversation, userMessage: string, learnedExamples: LearningExample[]): string {
  const recent = conversation.messages.slice(-20);
  const history = recent
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const learningContext = learnedExamples.length
    ? [
        "Learned examples (local knowledge base):",
        ...learnedExamples.map((item, index) => `example ${index + 1} question: ${item.question}\nexample ${index + 1} answer: ${item.answer}`),
      ].join("\n\n")
    : "";

  return [
    "You are a senior software engineer assistant focused on practical webapp development.",
    "Keep answers concise and actionable.",
    "If learned examples are relevant, prioritize those patterns in your response.",
    learningContext,
    history,
    `user: ${userMessage}`,
    "assistant:",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callOllama(model: string, prompt: string): Promise<string> {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.5,
        num_predict: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao acessar Ollama local. Verifique se ele está rodando.");
  }

  const data = (await response.json()) as { response?: string };
  if (!data.response) {
    throw new Error("Resposta inválida do Ollama.");
  }

  return data.response.trim();
}

function printHelp(): void {
  console.log("\nComandos:");
  console.log("  /help                 Mostra ajuda");
  console.log("  /new [titulo]         Cria nova conversa");
  console.log("  /list                 Lista conversas");
  console.log("  /use <numero>         Seleciona conversa pelo número da lista");
  console.log("  /history              Mostra histórico da conversa ativa");
  console.log("  /model <nome>         Troca modelo da conversa ativa");
  console.log("  /learn <p> => <r>     Adiciona exemplo de aprendizado local");
  console.log("  /learn-file <arquivo> Importa arquivo de treinamento");
  console.log("  /learn-list           Lista exemplos aprendidos");
  console.log("  /learn-clear          Remove todos os exemplos aprendidos");
  console.log("  /offline-status       Mostra status local/offline");
  console.log("  /perf [on|off|status] Mostra métricas de tempo e contexto");
  console.log("  /try-ollama           Tenta reconectar ao Ollama local");
  console.log("  /export [arquivo]     Exporta conversas+aprendizado para JSON");
  console.log("  /import <arquivo>     Importa conversas+aprendizado de JSON");
  console.log("  /exit                 Sai do chat\n");
}

async function verifyOllama(): Promise<void> {
  const response = await fetch("http://localhost:11434/api/tags");
  if (!response.ok) {
    throw new Error();
  }
}

async function showOfflineStatus(): Promise<void> {
  let ollamaOk = false;
  try {
    await verifyOllama();
    ollamaOk = true;
  } catch {
    ollamaOk = false;
  }

  let chatFileOk = false;
  let learningFileOk = false;
  try {
    await access(STORE_PATH, fsConstants.F_OK);
    chatFileOk = true;
  } catch {
    chatFileOk = false;
  }

  try {
    await access(LEARNING_PATH, fsConstants.F_OK);
    learningFileOk = true;
  } catch {
    learningFileOk = false;
  }

  console.log("\nStatus offline:");
  console.log(`- Ollama local: ${ollamaOk ? "OK" : "indisponível"}`);
  console.log(`- Chat JSON (${path.basename(STORE_PATH)}): ${chatFileOk ? "OK" : "ausente"}`);
  console.log(`- Learning JSON (${path.basename(LEARNING_PATH)}): ${learningFileOk ? "OK" : "ausente"}`);
  console.log();
}

async function exportOfflineData(chatStore: ChatStore, learningStore: LearningStore, fileName?: string): Promise<string> {
  const payload: OfflineExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    chatStore,
    learningStore,
  };
  const targetPath = path.resolve(process.cwd(), fileName?.trim() || `offline-export-${Date.now()}.json`);
  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return targetPath;
}

function isValidImportPayload(payload: unknown): payload is OfflineExport {
  const typed = payload as OfflineExport;
  return Boolean(
    typed
      && typeof typed === "object"
      && typeof typed.version === "number"
      && typed.chatStore
      && Array.isArray(typed.chatStore.conversations)
      && typeof typed.chatStore.activeConversationId === "string"
      && typed.learningStore
      && Array.isArray(typed.learningStore.examples)
  );
}

async function importOfflineData(fileName: string): Promise<void> {
  const targetPath = path.resolve(process.cwd(), fileName.trim());
  const raw = await readFile(targetPath, "utf8");
  const payload = JSON.parse(raw) as unknown;
  if (!isValidImportPayload(payload)) {
    throw new Error("Arquivo de importação inválido.");
  }
  await saveStore(payload.chatStore);
  await saveLearningStore(payload.learningStore);
}

function buildLocalOnlyResponse(examples: LearningExample[]): string {

  if (!examples.length) {
    return [
      "Estou em modo offline local (sem Ollama).",
      "Ainda não tenho um exemplo suficiente para essa pergunta.",
      "Use /learn ou /learn-file para me ensinar respostas específicas.",
    ].join(" ");
  }

  const top = examples[0];
  const alternatives = examples.slice(1);

  if (!alternatives.length) {
    return [
      "Modo offline local ativo.",
      `Resposta sugerida (aprendida): ${top.answer}`,
    ].join(" ");
  }

  const altText = alternatives.map((item, index) => `${index + 1}) ${item.answer}`).join(" | ");
  return [
    "Modo offline local ativo.",
    `Resposta principal: ${top.answer}`,
    `Alternativas aprendidas: ${altText}`,
  ].join(" ");
}

async function run(): Promise<void> {
  let ollamaAvailable = true;
  let perfMode = false;

  try {
    await verifyOllama();
  } catch {
    ollamaAvailable = false;
  }

  const rl = createInterface({ input, output });
  let store = await loadStore();
  let learningStore = await loadLearningStore();
  let learningIndex = buildLearningIndex(learningStore);

  const persistStore = async (): Promise<void> => {
    await saveStore(store);
  };

  const persistLearningStore = async (): Promise<void> => {
    learningStore.updatedAt = new Date().toISOString();
    await saveLearningStore(learningStore);
    learningIndex = buildLearningIndex(learningStore);
  };

  console.log("\nMiniCopilot Offline (Terminal)");
  console.log("Histórico em JSON: conversations.json");
  console.log("Aprendizado em JSON: learning.json");
  if (!ollamaAvailable) {
    console.log("Ollama não encontrado. Chat iniciado em modo offline local.");
    console.log("Dica: instale Ollama e rode `ollama serve`, depois use /try-ollama.");
  }
  console.log("Digite /help para comandos.\n");

  while (true) {
    const active = getActiveConversation(store);
    const promptPrefix = `[${active.title} | model=${active.model}]`;

    let userInput = "";
    try {
      userInput = (await rl.question(`${promptPrefix} > `)).trim();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("readline was closed")) {
        break;
      }
      throw error;
    }

    if (!userInput) {
      continue;
    }

    if (userInput === "/exit") {
      break;
    }

    if (userInput === "/help") {
      printHelp();
      continue;
    }

    if (userInput === "/list") {
      console.log("\nConversas:");
      store.conversations.forEach((conv, index) => {
        const marker = conv.id === store.activeConversationId ? "*" : " ";
        console.log(`${marker} ${index + 1}. ${conv.title} (${conv.messages.length} msgs, model=${conv.model})`);
      });
      console.log();
      continue;
    }

    if (userInput.startsWith("/new")) {
      const title = userInput.replace("/new", "").trim() || `Conversa ${store.conversations.length + 1}`;
      const conversation = createConversation(title, active.model || DEFAULT_MODEL);
      store.conversations.unshift(conversation);
      store.activeConversationId = conversation.id;
      await persistStore();
      console.log(`Nova conversa criada: ${conversation.title}`);
      continue;
    }

    if (userInput.startsWith("/use")) {
      const indexText = userInput.replace("/use", "").trim();
      const index = Number(indexText) - 1;
      if (Number.isNaN(index) || index < 0 || index >= store.conversations.length) {
        console.log("Índice inválido. Use /list para ver as conversas.");
        continue;
      }
      store.activeConversationId = store.conversations[index].id;
      await persistStore();
      console.log(`Conversa ativa: ${store.conversations[index].title}`);
      continue;
    }

    if (userInput === "/history") {
      const messages = active.messages;
      if (!messages.length) {
        console.log("Sem mensagens nesta conversa.\n");
        continue;
      }
      console.log();
      for (const message of messages) {
        console.log(`${message.role}: ${message.content}\n`);
      }
      continue;
    }

    if (userInput.startsWith("/model")) {
      const newModel = userInput.replace("/model", "").trim();
      if (!newModel) {
        console.log("Informe o modelo. Exemplo: /model llama3.2");
        continue;
      }
      active.model = newModel;
      active.updatedAt = new Date().toISOString();
      await persistStore();
      console.log(`Modelo atualizado para: ${newModel}`);
      continue;
    }

    if (userInput.startsWith("/learn ")) {
      const payload = userInput.replace("/learn", "").trim();
      const parts = payload.split("=>");
      if (parts.length < 2) {
        console.log("Formato inválido. Use: /learn pergunta => resposta");
        continue;
      }
      const question = parts[0].trim();
      const answer = parts.slice(1).join("=>").trim();
      if (!question || !answer) {
        console.log("Pergunta e resposta não podem estar vazias.");
        continue;
      }
      learningStore.examples.unshift({
        id: randomUUID(),
        question,
        answer,
        createdAt: new Date().toISOString(),
      });
      await persistLearningStore();
      console.log("Exemplo aprendido com sucesso.");
      continue;
    }

    if (userInput.startsWith("/learn-file")) {
      const fileName = userInput.replace("/learn-file", "").trim();
      if (!fileName) {
        console.log("Informe o arquivo. Exemplo: /learn-file training.json");
        continue;
      }
      try {
        const total = await importLearningFile(fileName, learningStore);
        learningIndex = buildLearningIndex(learningStore);
        console.log(`Aprendizado importado: ${total} exemplos novos.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.log(`Falha ao importar treinamento: ${message}`);
      }
      continue;
    }

    if (userInput === "/learn-list") {
      if (!learningStore.examples.length) {
        console.log("Sem exemplos aprendidos. Use /learn para adicionar.");
        continue;
      }
      console.log("\nExemplos aprendidos:");
      learningStore.examples.slice(0, 20).forEach((example, index) => {
        console.log(`${index + 1}. Q: ${example.question}`);
        console.log(`   A: ${example.answer}`);
      });
      console.log();
      continue;
    }

    if (userInput === "/learn-clear") {
      learningStore.examples = [];
      await persistLearningStore();
      console.log("Aprendizado local limpo.");
      continue;
    }

    if (userInput === "/offline-status") {
      await showOfflineStatus();
      continue;
    }

    if (userInput.startsWith("/perf")) {
      const value = userInput.replace("/perf", "").trim().toLowerCase();
      if (!value || value === "status") {
        console.log(`Perf mode: ${perfMode ? "ON" : "OFF"}`);
        continue;
      }
      if (value === "on") {
        perfMode = true;
        console.log("Perf mode ativado.");
        continue;
      }
      if (value === "off") {
        perfMode = false;
        console.log("Perf mode desativado.");
        continue;
      }
      console.log("Uso: /perf on | /perf off | /perf status");
      continue;
    }

    if (userInput === "/try-ollama") {
      try {
        await verifyOllama();
        ollamaAvailable = true;
        console.log("Conexão com Ollama restabelecida.");
      } catch {
        ollamaAvailable = false;
        console.log("Ollama ainda indisponível em http://localhost:11434.");
      }
      continue;
    }

    if (userInput.startsWith("/export")) {
      const fileName = userInput.replace("/export", "").trim();
      try {
        const outputPath = await exportOfflineData(store, learningStore, fileName || undefined);
        console.log(`Dados exportados para: ${outputPath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.log(`Falha ao exportar: ${message}`);
      }
      continue;
    }

    if (userInput.startsWith("/import")) {
      const fileName = userInput.replace("/import", "").trim();
      if (!fileName) {
        console.log("Informe o arquivo. Exemplo: /import offline-export-123.json");
        continue;
      }
      try {
        await importOfflineData(fileName);
        store = await loadStore();
        learningStore = await loadLearningStore();
        learningIndex = buildLearningIndex(learningStore);
        console.log("Dados importados com sucesso.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.log(`Falha ao importar: ${message}`);
      }
      continue;
    }

    const userMessage: Message = {
      id: randomUUID(),
      role: "user",
      content: userInput,
      createdAt: new Date().toISOString(),
    };
    active.messages.push(userMessage);
    active.updatedAt = new Date().toISOString();
    await persistStore();

    try {
      const startedAt = performance.now();
      const examples = rankLearnedExamplesFast(userInput, learningIndex);
      let assistantText = "";
      let responseSource: "ollama" | "offline" = "offline";

      if (ollamaAvailable) {
        try {
          const prompt = buildPrompt(active, userInput, examples);
          assistantText = await callOllama(active.model || DEFAULT_MODEL, prompt);
          responseSource = "ollama";
        } catch {
          ollamaAvailable = false;
          assistantText = buildLocalOnlyResponse(examples);
          responseSource = "offline";
        }
      } else {
        assistantText = buildLocalOnlyResponse(examples);
        responseSource = "offline";
      }

      const elapsedMs = Math.round(performance.now() - startedAt);

      const assistantMessage: Message = {
        id: randomUUID(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
      };
      active.messages.push(assistantMessage);
      active.updatedAt = new Date().toISOString();
      await persistStore();
      console.log(`\nassistant: ${assistantText}\n`);
      if (perfMode) {
        console.log(`[perf] source=${responseSource} time=${elapsedMs}ms examples_used=${examples.length} model=${active.model}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`Erro: ${message}\n`);
    }
  }

  rl.close();
  console.log("Chat encerrado.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (message.toLowerCase().includes("readline was closed")) {
    process.exit(0);
  }
  console.error(`Erro fatal: ${message}`);
  process.exit(1);
});
