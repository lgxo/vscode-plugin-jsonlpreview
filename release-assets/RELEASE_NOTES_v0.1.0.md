# Release Notes - v0.1.0

## 中文版

### Release Title

`JSONL Line Preview v0.1.0`

### Tag

`v0.1.0`

### Release Description

```markdown
## JSONL Line Preview v0.1.0

首个公开版本发布。

JSONL Line Preview 是一个面向 `.jsonl` 文件的 VS Code 扩展，用来将当前行快速预览为可展开、可折叠的 JSON 树，方便查看结构化日志、数据样本和逐行 JSON 记录。

### 主要特性

- 将当前 JSONL 行预览为可折叠的 JSON 树
- 支持从命令面板、编辑器右键菜单和编辑器右上角按钮打开预览
- 支持同时打开多个独立预览面板
- 每个预览面板都可以单独切换到新的当前行，而不会影响其他面板
- 自动记忆字段折叠状态，后续预览相同字段路径时可保持折叠
- 对空行和非法 JSON 提供明确提示

### 适用场景

- 查看日志型 `.jsonl` 文件
- 检查数据采样结果
- 快速浏览接口返回记录
- 对复杂嵌套 JSON 做结构化展开

### 安装方式

1. 下载 `jsonl-line-preview-0.1.0.vsix`
2. 在 VS Code 中执行 **Extensions: Install from VSIX...**
3. 选择下载好的 `.vsix` 文件完成安装

### 项目状态

这是项目的首个公开版本，当前重点在于稳定、直观地完成 JSONL 单行预览体验。

欢迎反馈使用体验和改进建议。
```

## English

### Release Title

`JSONL Line Preview v0.1.0`

### Tag

`v0.1.0`

### Release Description

```markdown
## JSONL Line Preview v0.1.0

First public release.

JSONL Line Preview is a VS Code extension for `.jsonl` files that lets you preview the current line as an expandable and collapsible JSON tree. It is designed for inspecting structured logs, sampled records, and line-based JSON data more comfortably.

### Highlights

- Preview the current JSONL line as a collapsible JSON tree
- Open previews from the command palette, editor context menu, or editor title button
- Keep multiple preview panels open at the same time
- Retarget each preview panel independently without affecting the others
- Remember collapsed field paths across later previews
- Show clear feedback for empty lines and invalid JSON

### Good for

- Inspecting log-style `.jsonl` files
- Reviewing sampled data records
- Browsing API result lines quickly
- Exploring deeply nested JSON structures

### Installation

1. Download `jsonl-line-preview-0.1.0.vsix`
2. In VS Code, run **Extensions: Install from VSIX...**
3. Select the downloaded `.vsix` file

### Project status

This is the first public release of the project. The current focus is a stable and straightforward single-line JSONL preview workflow.

Feedback and suggestions are welcome.
```
