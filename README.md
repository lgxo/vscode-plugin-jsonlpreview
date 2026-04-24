# JSONL Line Preview

Preview `.jsonl` records as formatted JSON and move through the file line by line.

## Features

- Preview the current JSONL line as formatted JSON text
- Move through the file with previous, next, jump, and line-1 actions
- Open previews from the command palette, right-click menu, editor title button, or Explorer file menu
- Keep multiple preview panels open at the same time
- Update one preview panel without affecting the others
- Preview a selected `.jsonl` file from line 1 or from any input line number without opening it first

## Install from this repository

### Option 1: install a packaged VSIX

1. Download the `.vsix` file from `release-assets/jsonl-line-preview-0.2.0.vsix` in this repository.
2. In VS Code, run **Extensions: Install from VSIX...**
3. Select the downloaded file.

Release copy for GitHub Releases is available in `release-assets/RELEASE_NOTES_v0.2.0.md`.

### Option 2: build the VSIX yourself

```bash
npm install
npm run package
```

Then install the generated `.vsix` file in VS Code with **Extensions: Install from VSIX...**

## Usage

1. Use either workflow:
   - Open a `.jsonl` file, move the cursor to the line you want, and launch **JSONL: Preview Current Line**.
   - In the Explorer, select a `.jsonl` file and launch **JSONL: Preview File From Line 1** or **JSONL: Preview File From Line N** without opening the file.
2. Open the preview with any of these entry points:
   - the editor right-click menu
   - the Command Palette
   - the editor title button in the top-right area when a `.jsonl` file is active
   - the Explorer right-click menu for `.jsonl` files
3. Each invocation opens a new preview panel with its own independent state.
4. Inside any preview panel, use **Line 1**, **Previous**, **Next**, and **Jump** to move between JSONL records.
5. Click **Use Current Line** to retarget only that panel to the active editor's current JSONL line.
6. Close any preview panel to stop using that specific preview instance.

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
5. Use **Previous**, **Next**, and **Jump** in the preview panel to confirm line navigation works.
6. In the Explorer, right-click a `.jsonl` file and open **JSONL: Preview File From Line 1** without opening the file first.
7. In the Explorer, right-click a `.jsonl` file and open **JSONL: Preview File From Line N**, enter a line number, and confirm the preview starts there.
8. Move to another line in an open editor, click **Use Current Line**, and confirm that only that panel changes.
9. Open the preview multiple times and confirm each panel remains independent.

## Publishing notes

- This repository can be shared directly with friends.
- To publish on the VS Code Marketplace later, you still need to create a Marketplace publisher and run `vsce publish` with your publisher account.
