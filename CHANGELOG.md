# Changelog

## 0.2.0

- Switch preview rendering from a collapsible tree to formatted JSON text.
- Add in-panel navigation for line 1, previous line, next line, and jump to line.
- Add Explorer entry points to preview a selected `.jsonl` file from line 1 or from an input line number without opening it first.
- Read unopened local `.jsonl` files on demand so large-file preview can start from the requested line.

## 0.1.0

- Preview the current JSONL line as a collapsible JSON tree.
- Open preview panels from the command palette, editor context menu, or editor title button.
- Support multiple independent preview panels.
- Remember collapsed field paths across later previews.
- Allow each preview panel to retarget itself to the current JSONL line.
