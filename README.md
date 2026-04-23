# JSONL Line Preview

Preview the current line in a `.jsonl` file as a collapsible JSON tree.

## Features

- Preview the current JSONL line as a tree view
- Open previews from the command palette, right-click menu, or editor title button
- Keep multiple preview panels open at the same time
- Update one preview panel without affecting the others
- Remember collapsed field paths across later previews

## Install from this repository

### Option 1: install a packaged VSIX

1. Download the `.vsix` file from `release-assets/jsonl-line-preview-0.1.0.vsix` in this repository.
2. In VS Code, run **Extensions: Install from VSIX...**
3. Select the downloaded file.

### Option 2: build the VSIX yourself

```bash
npm install
npm run package
```

Then install the generated `.vsix` file in VS Code with **Extensions: Install from VSIX...**

## Usage

1. Open a `.jsonl` file.
2. Move the cursor to the line you want to inspect.
3. Open the preview with any of these entry points:
   - the editor right-click menu
   - the Command Palette
   - the editor title button in the top-right area when a `.jsonl` file is active
4. Each invocation opens a new preview panel locked to the current line.
5. Inside any preview panel, click **Use Current Line** to retarget only that panel to the editor's current JSONL line.
6. Close any preview panel to stop using that specific preview instance.
7. Collapse choices are remembered by field path, so previously collapsed fields stay collapsed in later previews while unseen fields default to expanded.

## Development

```bash
npm install
npm run compile
```

## Testing

1. Open this extension folder in VS Code.
2. Press `F5` to start an Extension Development Host window.
3. In the new window, open a `.jsonl` file.
4. Place the cursor on a JSONL record and open the preview from the toolbar button, Command Palette, or editor right-click menu.
5. Move to another line and open the preview again to confirm a second independent panel appears.
6. Focus one preview panel, move the editor cursor to a different JSONL line, click **Use Current Line**, and confirm that only that panel changes.
7. Close one preview panel and confirm the others stay open.
8. Collapse a field, open a later preview containing the same field path, and confirm that it stays collapsed while new fields remain expanded.

## Publishing notes

- This repository can be shared directly with friends.
- To publish on the VS Code Marketplace later, you still need to create a Marketplace publisher and run `vsce publish` with your publisher account.
