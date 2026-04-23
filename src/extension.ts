import * as path from "path";
import * as vscode from "vscode";

const COLLAPSED_PATHS_KEY = "jsonlLinePreview.collapsedPaths";
const PREVIEW_PANEL_ID = "jsonlLinePreview.panel";
const PREVIEW_PANEL_TITLE = "JSONL Line Preview";

let collapsedPaths = new Set<string>();
let lastJsonlSource: PreviewSource | undefined;
let previewPanelCount = 0;

export function activate(context: vscode.ExtensionContext): void {
  collapsedPaths = new Set(context.workspaceState.get<string[]>(COLLAPSED_PATHS_KEY, []));

  const disposable = vscode.commands.registerCommand(
    "jsonlLinePreview.previewCurrentLine",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showErrorMessage("Open a JSONL file to preview a line.");
        return;
      }

      if (!isJsonlDocument(editor.document)) {
        void vscode.window.showErrorMessage("The active file must be a .jsonl document.");
        return;
      }

      rememberJsonlSource(editor);
      const preview = buildPreviewDataFromEditor(editor);
      const panel = createPreviewPanel(context, preview);
      panel.reveal(vscode.ViewColumn.Beside);
    }
  );

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && isJsonlDocument(editor.document)) {
      rememberJsonlSource(editor);
    }
  });

  const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
    if (isJsonlDocument(event.textEditor.document)) {
      rememberJsonlSource(event.textEditor);
    }
  });

  context.subscriptions.push(disposable, activeEditorListener, selectionListener);
}

export function deactivate(): void {
  collapsedPaths.clear();
  lastJsonlSource = undefined;
  previewPanelCount = 0;
}

function isJsonlDocument(document: vscode.TextDocument): boolean {
  return document.fileName.toLowerCase().endsWith(".jsonl");
}

function createPreviewPanel(
  context: vscode.ExtensionContext,
  preview: PreviewData
): vscode.WebviewPanel {
  previewPanelCount += 1;
  const panelIndex = previewPanelCount;

  const panel = vscode.window.createWebviewPanel(
    PREVIEW_PANEL_ID,
    `${PREVIEW_PANEL_TITLE} ${panelIndex}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      enableFindWidget: true,
      retainContextWhenHidden: true
    }
  );

  updatePanelContent(panel, panelIndex, preview);

  panel.webview.onDidReceiveMessage(async (message: PreviewMessage) => {
    if (message.type === "useCurrentLine") {
      const previewFromSource = await buildPreviewDataFromRememberedSource();
      if (!previewFromSource) {
        void vscode.window.showErrorMessage("Select a line in a .jsonl file before updating the preview.");
        return;
      }

      updatePanelContent(panel, panelIndex, previewFromSource);
      return;
    }

    if (message.type !== "toggle" || typeof message.path !== "string") {
      return;
    }

    if (message.collapsed) {
      collapsedPaths.add(message.path);
    } else {
      collapsedPaths.delete(message.path);
    }

    void context.workspaceState.update(COLLAPSED_PATHS_KEY, [...collapsedPaths]);
  }, null, context.subscriptions);

  return panel;
}

function updatePanelContent(panel: vscode.WebviewPanel, panelIndex: number, preview: PreviewData): void {
  panel.title = `${PREVIEW_PANEL_TITLE} ${panelIndex} (Line ${preview.lineNumber})`;
  panel.webview.html = renderPreview(preview, [...collapsedPaths]);
}

function rememberJsonlSource(editor: vscode.TextEditor): void {
  lastJsonlSource = {
    documentUri: editor.document.uri,
    lineNumber: editor.selection.active.line
  };
}

async function buildPreviewDataFromRememberedSource(): Promise<PreviewData | undefined> {
  if (!lastJsonlSource) {
    return undefined;
  }

  const openDocument = vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === lastJsonlSource?.documentUri.toString()
  );

  const document = openDocument ?? await vscode.workspace.openTextDocument(lastJsonlSource.documentUri);
  return buildPreviewDataFromDocument(document, lastJsonlSource.lineNumber);
}

function buildPreviewDataFromEditor(editor: vscode.TextEditor): PreviewData {
  return buildPreviewDataFromDocument(editor.document, editor.selection.active.line);
}

function buildPreviewDataFromDocument(document: vscode.TextDocument, lineNumber: number): PreviewData {
  const safeLineNumber = Math.min(Math.max(lineNumber, 0), Math.max(document.lineCount - 1, 0));
  const lineText = document.lineAt(safeLineNumber).text.trim();
  const sourceFileName = path.basename(document.fileName);

  if (!lineText) {
    return {
      lineNumber: safeLineNumber + 1,
      sourceFileName,
      mode: "info",
      title: `Line ${safeLineNumber + 1} is empty`,
      message: "Move the cursor to a JSONL line with content before opening a preview."
    };
  }

  try {
    return {
      lineNumber: safeLineNumber + 1,
      sourceFileName,
      mode: "preview",
      value: JSON.parse(lineText) as unknown
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    return {
      lineNumber: safeLineNumber + 1,
      sourceFileName,
      mode: "error",
      message: `Unable to parse JSON on line ${safeLineNumber + 1}: ${message}`,
      sourceLine: lineText
    };
  }
}

function renderPreview(preview: PreviewData, rememberedCollapsedPaths: string[]): string {
  if (preview.mode === "preview") {
    return renderPreviewHtml(preview, rememberedCollapsedPaths);
  }

  if (preview.mode === "error") {
    return renderErrorHtml(preview);
  }

  return renderInfoHtml(preview);
}

function renderPreviewHtml(preview: PreviewDataPreview, rememberedCollapsedPaths: string[]): string {
  const payload = serializeForScript(preview.value);
  const collapsedPayload = serializeForScript(rememberedCollapsedPaths);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(PREVIEW_PANEL_TITLE)}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 16px;
      }
      .header {
        margin-bottom: 16px;
      }
      .header h1 {
        font-size: 16px;
        margin: 0 0 4px;
      }
      .header p {
        margin: 0;
        color: var(--vscode-descriptionForeground);
      }
      .actions {
        margin-top: 12px;
      }
      .action-button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .action-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .tree,
      .tree ul {
        list-style: none;
        margin: 0;
        padding-left: 16px;
      }
      .tree {
        padding-left: 0;
      }
      .node {
        margin: 4px 0;
      }
      .node-row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        line-height: 1.5;
        word-break: break-word;
      }
      .toggle {
        appearance: none;
        border: none;
        background: transparent;
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        padding: 0;
        width: 14px;
        flex: 0 0 14px;
      }
      .toggle-placeholder {
        width: 14px;
        flex: 0 0 14px;
      }
      .key {
        color: var(--vscode-symbolIcon-propertyForeground, var(--vscode-editor-foreground));
      }
      .string {
        color: var(--vscode-debugTokenExpression-string);
      }
      .number {
        color: var(--vscode-debugTokenExpression-number);
      }
      .boolean {
        color: var(--vscode-debugTokenExpression-boolean);
      }
      .null {
        color: var(--vscode-disabledForeground);
      }
      .punctuation {
        color: var(--vscode-editor-foreground);
      }
      .collapsed > ul {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${escapeHtml(PREVIEW_PANEL_TITLE)}</h1>
      <p>${escapeHtml(preview.sourceFileName)} · line ${preview.lineNumber}</p>
      <div class="actions">
        <button class="action-button" type="button" id="use-current-line">Use Current Line</button>
      </div>
    </div>
    <div id="tree-root"></div>
    <script>
      const vscode = acquireVsCodeApi();
      const data = ${payload};
      const collapsedPaths = new Set(${collapsedPayload});

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function primitiveClass(value) {
        if (value === null) {
          return "null";
        }
        return typeof value;
      }

      function primitiveMarkup(value) {
        if (typeof value === "string") {
          return '<span class="string">"' + escapeHtml(value) + '"</span>';
        }
        if (value === null) {
          return '<span class="null">null</span>';
        }
        return '<span class="' + primitiveClass(value) + '">' + escapeHtml(value) + '</span>';
      }

      function summary(value) {
        if (Array.isArray(value)) {
          return '[...] (' + value.length + ')';
        }
        return '{...} (' + Object.keys(value).length + ')';
      }

      function encodePathSegment(segment) {
        return String(segment).replace(/~/g, "~0").replace(/\\//g, "~1");
      }

      function childPath(path, segment) {
        return path + "/" + encodePathSegment(segment);
      }

      function createNode(label, value, path) {
        const item = document.createElement("li");
        item.className = "node";
        item.dataset.path = path;

        const row = document.createElement("div");
        row.className = "node-row";

        const isExpandable = value !== null && typeof value === "object";
        if (isExpandable) {
          const toggle = document.createElement("button");
          toggle.className = "toggle";
          toggle.type = "button";
          const isCollapsed = collapsedPaths.has(path);
          toggle.textContent = isCollapsed ? "▸" : "▾";
          item.classList.toggle("collapsed", isCollapsed);
          toggle.addEventListener("click", () => {
            const collapsed = item.classList.toggle("collapsed");
            toggle.textContent = collapsed ? "▸" : "▾";
            if (collapsed) {
              collapsedPaths.add(path);
            } else {
              collapsedPaths.delete(path);
            }
            vscode.postMessage({ type: "toggle", path, collapsed });
          });
          row.appendChild(toggle);
        } else {
          const spacer = document.createElement("span");
          spacer.className = "toggle-placeholder";
          row.appendChild(spacer);
        }

        const content = document.createElement("span");
        if (label !== null) {
          content.innerHTML =
            '<span class="key">' + escapeHtml(label) + '</span><span class="punctuation">: </span>';
        }

        if (isExpandable) {
          content.innerHTML += '<span class="punctuation">' + summary(value) + '</span>';
        } else {
          content.innerHTML += primitiveMarkup(value);
        }
        row.appendChild(content);
        item.appendChild(row);

        if (isExpandable) {
          const list = document.createElement("ul");
          const entries = Array.isArray(value)
            ? value.map((entry, index) => [String(index), entry])
            : Object.entries(value);

          for (const [childLabel, childValue] of entries) {
            list.appendChild(createNode(childLabel, childValue, childPath(path, childLabel)));
          }

          if (entries.length === 0) {
            list.appendChild(createNode(null, Array.isArray(value) ? "[]" : "{}", childPath(path, "__empty")));
          }

          item.appendChild(list);
        }

        return item;
      }

      const root = document.createElement("ul");
      root.className = "tree";
      root.appendChild(createNode(null, data, ""));
      document.getElementById("tree-root").appendChild(root);
      document.getElementById("use-current-line").addEventListener("click", () => {
        vscode.postMessage({ type: "useCurrentLine" });
      });
    </script>
  </body>
</html>`;
}

function renderErrorHtml(preview: PreviewDataError): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(PREVIEW_PANEL_TITLE)}</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        padding: 16px;
      }
      .error {
        color: var(--vscode-errorForeground);
        margin-bottom: 12px;
      }
      .actions {
        margin: 12px 0;
      }
      .action-button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .action-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--vscode-textCodeBlock-background);
        padding: 12px;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(PREVIEW_PANEL_TITLE)}</h1>
    <p>${escapeHtml(preview.sourceFileName)} · line ${preview.lineNumber}</p>
    <div class="actions">
      <button class="action-button" type="button" id="use-current-line">Use Current Line</button>
    </div>
    <p class="error">${escapeHtml(preview.message)}</p>
    <pre>${escapeHtml(preview.sourceLine)}</pre>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById("use-current-line").addEventListener("click", () => {
        vscode.postMessage({ type: "useCurrentLine" });
      });
    </script>
  </body>
</html>`;
}

function renderInfoHtml(preview: PreviewDataInfo): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(PREVIEW_PANEL_TITLE)}</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        padding: 16px;
      }
      p {
        color: var(--vscode-descriptionForeground);
      }
      .actions {
        margin: 12px 0;
      }
      .action-button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .action-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(preview.title)}</h1>
    <p>${escapeHtml(preview.sourceFileName)} · line ${preview.lineNumber}</p>
    <div class="actions">
      <button class="action-button" type="button" id="use-current-line">Use Current Line</button>
    </div>
    <p>${escapeHtml(preview.message)}</p>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById("use-current-line").addEventListener("click", () => {
        vscode.postMessage({ type: "useCurrentLine" });
      });
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

type PreviewMessage = {
  type: "toggle";
  path: string;
  collapsed: boolean;
} | {
  type: "useCurrentLine";
};

type PreviewDataBase = {
  lineNumber: number;
  sourceFileName: string;
};

type PreviewDataPreview = PreviewDataBase & {
  mode: "preview";
  value: unknown;
};

type PreviewDataError = PreviewDataBase & {
  mode: "error";
  message: string;
  sourceLine: string;
};

type PreviewDataInfo = PreviewDataBase & {
  mode: "info";
  title: string;
  message: string;
};

type PreviewData = PreviewDataPreview | PreviewDataError | PreviewDataInfo;

type PreviewSource = {
  documentUri: vscode.Uri;
  lineNumber: number;
};
