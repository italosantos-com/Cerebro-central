import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("conversations.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/conversations", (req, res) => {
    const conversations = db.prepare("SELECT * FROM conversations ORDER BY created_at DESC").all();
    res.json(conversations);
  });

  app.post("/api/conversations", (req, res) => {
    const { title } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO conversations (id, title) VALUES (?, ?)").run(id, title || "Nova Conversa");
    res.json({ id, title: title || "Nova Conversa" });
  });

  app.get("/api/conversations/:id", (req, res) => {
    const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
    if (!conversation) return res.status(404).json({ error: "Not found" });
    const messages = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(req.params.id);
    res.json({ ...conversation, messages });
  });

  app.delete("/api/conversations/:id", (req, res) => {
    db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/chat/:id", async (req, res) => {
    const { prompt, model = "mistral" } = req.body;
    const conversationId = req.params.id;

    // Save user message
    db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, "user", prompt);

    // Get context (last 10 messages)
    const history = db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10").all(conversationId);
    const context = history.reverse().map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const fullPrompt = `You are a senior software engineer assistant.
Continue the conversation.

${context}
assistant:`;

    try {
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          prompt: fullPrompt,
          stream: false,
          options: {
            num_ctx: 2048,
            temperature: 0.7,
            num_predict: 500
          }
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error("Ollama not responding. Make sure it is running locally.");
      }

      const data = await ollamaResponse.json();
      const assistantResponse = data.response;

      // Save assistant message
      db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, "assistant", assistantResponse);

      res.json({ response: assistantResponse });
    } catch (error: any) {
      console.error("Ollama error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
