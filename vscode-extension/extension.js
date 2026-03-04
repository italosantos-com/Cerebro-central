const vscode = require("vscode");

function createProvider() {
  return {
    async provideInlineCompletionItems(document, position) {
      const config = vscode.workspace.getConfiguration("offlineDevAssistant");
      const backendUrl = config.get("backendUrl", "http://127.0.0.1:8000");

      const fullText = document.getText();
      const offset = document.offsetAt(position);
      const prefix = fullText.slice(Math.max(0, offset - 2500), offset);
      const suffix = fullText.slice(offset, Math.min(fullText.length, offset + 500));

      if (!prefix.trim()) {
        return { items: [] };
      }

      try {
        const response = await fetch(`${backendUrl}/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: document.uri.fsPath,
            language: document.languageId,
            prefix,
            suffix,
          }),
        });

        if (!response.ok) {
          return { items: [] };
        }

        const data = await response.json();
        const completion = (data.completion || "").trim();
        if (!completion) {
          return { items: [] };
        }

        return {
          items: [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))],
        };
      } catch {
        return { items: [] };
      }
    },
  };
}

function activate(context) {
  const selector = [
    { language: "python" },
    { language: "javascript" },
    { language: "typescript" },
    { language: "html" },
    { language: "css" },
  ];

  const provider = createProvider();
  const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, provider);
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
