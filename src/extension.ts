import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as vscode from "vscode";

const PREVIEW_PANEL_ID = "jsonlLinePreview.panel";
const PREVIEW_PANEL_TITLE = "JSONL Line Preview";

let lastJsonlSource: PreviewSource | undefined;
let previewPanelCount = 0;

export function activate(context: vscode.ExtensionContext): void {
  const previewCurrentLineCommand = vscode.commands.registerCommand(
    "jsonlLinePreview.previewCurrentLine",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showErrorMessage("Open a JSONL file to preview the current line.");
        return;
      }

      if (!isJsonlDocument(editor.document)) {
        void vscode.window.showErrorMessage("The active file must be a .jsonl document.");
        return;
      }

      rememberJsonlSource(editor);
      const panel = createPreviewPanel(context, {
        documentUri: editor.document.uri,
        lineNumber: editor.selection.active.line
      });
      panel.reveal(vscode.ViewColumn.Beside);
    }
  );

  const previewFileFromStartCommand = vscode.commands.registerCommand(
    "jsonlLinePreview.previewFileFromStart",
    async (resource?: vscode.Uri) => {
      const targetUri = getTargetJsonlUri(resource);
      if (!targetUri) {
        return;
      }

      const panel = createPreviewPanel(context, {
        documentUri: targetUri,
        lineNumber: 0
      });
      panel.reveal(vscode.ViewColumn.Beside);
    }
  );

  const previewFileFromLineNumberCommand = vscode.commands.registerCommand(
    "jsonlLinePreview.previewFileFromLineNumber",
    async (resource?: vscode.Uri) => {
      const targetUri = getTargetJsonlUri(resource);
      if (!targetUri) {
        return;
      }

      const requestedLineNumber = await promptForLineNumber();
      if (requestedLineNumber === undefined) {
        return;
      }

      const panel = createPreviewPanel(context, {
        documentUri: targetUri,
        lineNumber: requestedLineNumber - 1
      });
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

  context.subscriptions.push(
    previewCurrentLineCommand,
    previewFileFromStartCommand,
    previewFileFromLineNumberCommand,
    activeEditorListener,
    selectionListener
  );
}

export function deactivate(): void {
  lastJsonlSource = undefined;
  previewPanelCount = 0;
}

function isJsonlDocument(document: vscode.TextDocument): boolean {
  return isJsonlUri(document.uri);
}

function isJsonlUri(uri: vscode.Uri): boolean {
  const target = (uri.fsPath || uri.path).toLowerCase();
  return target.endsWith(".jsonl");
}

function getTargetJsonlUri(resource?: vscode.Uri): vscode.Uri | undefined {
  const targetUri = resource ?? vscode.window.activeTextEditor?.document.uri;
  if (!targetUri) {
    void vscode.window.showErrorMessage("Select or open a .jsonl file before starting preview.");
    return undefined;
  }

  if (!isJsonlUri(targetUri)) {
    void vscode.window.showErrorMessage("The selected file must be a .jsonl document.");
    return undefined;
  }

  return targetUri;
}

async function promptForLineNumber(): Promise<number | undefined> {
  const value = await vscode.window.showInputBox({
    title: "JSONL Preview Start Line",
    prompt: "Enter the line number to preview first.",
    placeHolder: "1",
    validateInput: (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        return "Line number is required.";
      }

      if (!/^\d+$/.test(trimmed)) {
        return "Enter a positive integer.";
      }

      const lineNumber = Number(trimmed);
      if (!Number.isSafeInteger(lineNumber) || lineNumber < 1) {
        return "Enter a line number greater than 0.";
      }

      return undefined;
    }
  });

  if (value === undefined) {
    return undefined;
  }

  return Number(value.trim());
}

function createPreviewPanel(
  context: vscode.ExtensionContext,
  initialSource: PreviewSource
): vscode.WebviewPanel {
  previewPanelCount += 1;
  const panelIndex = previewPanelCount;
  const state: PreviewSource = { ...initialSource };

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

  void renderPanel(panel, panelIndex, state);

  panel.webview.onDidReceiveMessage(async (message: PreviewMessage) => {
    switch (message.type) {
      case "useCurrentLine": {
        const previewFromSource = await buildPreviewSourceFromRememberedSource();
        if (!previewFromSource) {
          void vscode.window.showErrorMessage("Select a line in a .jsonl file before updating the preview.");
          return;
        }

        state.documentUri = previewFromSource.documentUri;
        state.lineNumber = previewFromSource.lineNumber;
        await renderPanel(panel, panelIndex, state);
        return;
      }

      case "goToFirstLine":
        state.lineNumber = 0;
        await renderPanel(panel, panelIndex, state);
        return;

      case "previousLine":
        state.lineNumber = Math.max(state.lineNumber - 1, 0);
        await renderPanel(panel, panelIndex, state);
        return;

      case "nextLine": {
        const didNavigate = await tryNavigateToLine(panel, panelIndex, state, state.lineNumber + 1);
        if (!didNavigate) {
          void vscode.window.showInformationMessage("Already at the last line of this JSONL file.");
        }
        return;
      }

      case "jumpToLine": {
        const requestedLineNumber = Number(message.lineNumber);
        if (!Number.isInteger(requestedLineNumber) || requestedLineNumber < 1) {
          void vscode.window.showErrorMessage("Enter a valid line number greater than 0.");
          return;
        }

        const didNavigate = await tryNavigateToLine(panel, panelIndex, state, requestedLineNumber - 1);
        if (!didNavigate) {
          void vscode.window.showErrorMessage(`Line ${requestedLineNumber} does not exist in this JSONL file.`);
        }
      }
    }
  }, null, context.subscriptions);

  return panel;
}

async function renderPanel(
  panel: vscode.WebviewPanel,
  panelIndex: number,
  source: PreviewSource
): Promise<void> {
  const result = await buildPreviewDataFromUri(source.documentUri, source.lineNumber);
  source.lineNumber = result.lineNumber;
  updatePanelContent(panel, panelIndex, result.preview);
}

async function tryNavigateToLine(
  panel: vscode.WebviewPanel,
  panelIndex: number,
  source: PreviewSource,
  targetLineNumber: number
): Promise<boolean> {
  const result = await buildPreviewDataFromUri(source.documentUri, targetLineNumber);
  if (result.isOutOfRange) {
    return false;
  }

  source.lineNumber = result.lineNumber;
  updatePanelContent(panel, panelIndex, result.preview);
  return true;
}

function updatePanelContent(panel: vscode.WebviewPanel, panelIndex: number, preview: PreviewData): void {
  panel.title = `${PREVIEW_PANEL_TITLE} ${panelIndex} (Line ${preview.lineNumber})`;
  panel.webview.html = renderPreview(preview);
}

function rememberJsonlSource(editor: vscode.TextEditor): void {
  lastJsonlSource = {
    documentUri: editor.document.uri,
    lineNumber: editor.selection.active.line
  };
}

async function buildPreviewSourceFromRememberedSource(): Promise<PreviewSource | undefined> {
  if (!lastJsonlSource) {
    return undefined;
  }

  return { ...lastJsonlSource };
}

async function buildPreviewDataFromUri(
  documentUri: vscode.Uri,
  lineNumber: number
): Promise<PreviewBuildResult> {
  const sourceFileName = path.basename(documentUri.fsPath || documentUri.path);
  const normalizedLineNumber = Math.max(lineNumber, 0);
  const lineResult = await readJsonlLine(documentUri, normalizedLineNumber);

  if (lineResult.type === "missing") {
    return {
      lineNumber: 0,
      isOutOfRange: normalizedLineNumber > 0 || lineResult.lineCount > 0,
      preview: {
        lineNumber: 1,
        sourceFileName,
        mode: "info",
        title: lineResult.lineCount === 0 ? "The file is empty" : `Line ${normalizedLineNumber + 1} is out of range`,
        message: lineResult.lineCount === 0
          ? "This JSONL file has no lines to preview yet."
          : `This JSONL file currently has ${lineResult.lineCount} line(s).`
      }
    };
  }

  const rawLine = lineResult.text;
  const trimmedLine = rawLine.trim();

  if (!trimmedLine) {
    return {
      lineNumber: normalizedLineNumber,
      isOutOfRange: false,
      preview: {
        lineNumber: normalizedLineNumber + 1,
        sourceFileName,
        mode: "info",
        title: `Line ${normalizedLineNumber + 1} is empty`,
        message: "Move to another line, or jump to a line that contains JSON data."
      }
    };
  }

  try {
    const parsedValue = JSON.parse(trimmedLine) as unknown;
    return {
      lineNumber: normalizedLineNumber,
      isOutOfRange: false,
      preview: {
        lineNumber: normalizedLineNumber + 1,
        sourceFileName,
        mode: "preview",
        formattedJson: JSON.stringify(parsedValue, null, 2)
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    return {
      lineNumber: normalizedLineNumber,
      isOutOfRange: false,
      preview: {
        lineNumber: normalizedLineNumber + 1,
        sourceFileName,
        mode: "error",
        message: `Unable to parse JSON on line ${normalizedLineNumber + 1}: ${message}`,
        sourceLine: rawLine
      }
    };
  }
}

async function readJsonlLine(documentUri: vscode.Uri, lineNumber: number): Promise<LineReadResult> {
  const openDocument = vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === documentUri.toString()
  );

  if (openDocument) {
    return readJsonlLineFromDocument(openDocument, lineNumber);
  }

  if (documentUri.scheme === "file") {
    return readJsonlLineFromFile(documentUri.fsPath, lineNumber);
  }

  const document = await vscode.workspace.openTextDocument(documentUri);
  return readJsonlLineFromDocument(document, lineNumber);
}

function readJsonlLineFromDocument(document: vscode.TextDocument, lineNumber: number): LineReadResult {
  if (document.lineCount === 0 || lineNumber >= document.lineCount) {
    return {
      type: "missing",
      lineCount: document.lineCount
    };
  }

  return {
    type: "line",
    text: document.lineAt(lineNumber).text
  };
}

async function readJsonlLineFromFile(filePath: string, lineNumber: number): Promise<LineReadResult> {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let currentLineNumber = 0;

  try {
    for await (const line of reader) {
      if (currentLineNumber === lineNumber) {
        return {
          type: "line",
          text: line
        };
      }

      currentLineNumber += 1;
    }

    return {
      type: "missing",
      lineCount: currentLineNumber
    };
  } finally {
    reader.close();
    stream.destroy();
  }
}

function renderPreview(preview: PreviewData): string {
  const bodyHtml = renderPreviewBody(preview);
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
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .jump-group {
        display: flex;
        align-items: center;
        gap: 8px;
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
      .jump-input {
        width: 96px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border-radius: 4px;
        padding: 6px 8px;
      }
      .content {
        border-radius: 6px;
        background: var(--vscode-textCodeBlock-background);
        padding: 12px;
      }
      .content pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
        font-size: var(--vscode-editor-font-size);
        line-height: 1.5;
      }
      .error {
        color: var(--vscode-errorForeground);
        margin: 0 0 12px;
      }
      .info {
        color: var(--vscode-descriptionForeground);
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${escapeHtml(PREVIEW_PANEL_TITLE)}</h1>
      <p>${escapeHtml(preview.sourceFileName)} · line ${preview.lineNumber}</p>
      <div class="controls">
        <button class="action-button" type="button" id="go-to-first-line">Line 1</button>
        <button class="action-button" type="button" id="previous-line">Previous</button>
        <button class="action-button" type="button" id="next-line">Next</button>
        <button class="action-button" type="button" id="use-current-line">Use Current Line</button>
        <div class="jump-group">
          <input class="jump-input" type="number" id="jump-line-input" min="1" step="1" value="${preview.lineNumber}" />
          <button class="action-button" type="button" id="jump-to-line">Jump</button>
        </div>
      </div>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      const jumpInput = document.getElementById("jump-line-input");

      document.getElementById("go-to-first-line").addEventListener("click", () => {
        vscode.postMessage({ type: "goToFirstLine" });
      });
      document.getElementById("previous-line").addEventListener("click", () => {
        vscode.postMessage({ type: "previousLine" });
      });
      document.getElementById("next-line").addEventListener("click", () => {
        vscode.postMessage({ type: "nextLine" });
      });
      document.getElementById("use-current-line").addEventListener("click", () => {
        vscode.postMessage({ type: "useCurrentLine" });
      });

      function submitJump() {
        const lineNumber = Number(jumpInput.value);
        vscode.postMessage({ type: "jumpToLine", lineNumber });
      }

      document.getElementById("jump-to-line").addEventListener("click", submitJump);
      jumpInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          submitJump();
        }
      });
    </script>
  </body>
</html>`;
}

function renderPreviewBody(preview: PreviewData): string {
  switch (preview.mode) {
    case "preview":
      return `<pre>${escapeHtml(preview.formattedJson)}</pre>`;
    case "error":
      return `<p class="error">${escapeHtml(preview.message)}</p><pre>${escapeHtml(preview.sourceLine)}</pre>`;
    case "info":
      return `<p class="info">${escapeHtml(preview.title)}</p><p class="info">${escapeHtml(preview.message)}</p>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type PreviewMessage =
  | { type: "goToFirstLine" }
  | { type: "previousLine" }
  | { type: "nextLine" }
  | { type: "useCurrentLine" }
  | {
    type: "jumpToLine";
    lineNumber: number;
  };

type PreviewDataBase = {
  lineNumber: number;
  sourceFileName: string;
};

type PreviewDataPreview = PreviewDataBase & {
  mode: "preview";
  formattedJson: string;
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

type PreviewBuildResult = {
  lineNumber: number;
  isOutOfRange: boolean;
  preview: PreviewData;
};

type LineReadResult =
  | {
    type: "line";
    text: string;
  }
  | {
    type: "missing";
    lineCount: number;
  };
