# Release Notes - v0.2.0

## 中文版

### Release Title

`JSONL Line Preview v0.2.0`

### Tag

`v0.2.0`

### Release Description

```markdown
## JSONL Line Preview v0.2.0

本次版本聚焦于更适合日常查看 JSONL 数据的预览体验，尤其是大文件浏览。

### 主要更新

- 预览内容改为格式化 JSON 文本，阅读更直接
- 预览面板内新增 **Line 1 / Previous / Next / Jump** 导航
- 资源管理器右键新增两个入口：
  - **JSONL: Preview File From Line 1**
  - **JSONL: Preview File From Line N**
- 支持在不打开 `.jsonl` 文件的情况下，直接从指定起始行开始预览
- 对未打开的大文件按需读取目标行，减少依赖整文件打开带来的负担

### 适用场景

- 从头浏览大型 `.jsonl` 日志文件
- 直接跳转到指定记录进行检查
- 在多个预览面板之间对比不同区段的数据
- 快速查看结构化日志、采样数据和逐行 JSON 结果

### 安装方式

1. 下载 `jsonl-line-preview-0.2.0.vsix`
2. 在 VS Code 中执行 **Extensions: Install from VSIX...**
3. 选择下载好的 `.vsix` 文件完成安装
```

## English

### Release Title

`JSONL Line Preview v0.2.0`

### Tag

`v0.2.0`

### Release Description

```markdown
## JSONL Line Preview v0.2.0

This release focuses on a more practical JSONL browsing workflow, especially for large files.

### Highlights

- Switch the preview to formatted JSON text for easier reading
- Add in-panel navigation with **Line 1 / Previous / Next / Jump**
- Add two Explorer entry points:
  - **JSONL: Preview File From Line 1**
  - **JSONL: Preview File From Line N**
- Start previewing a `.jsonl` file from a requested line without opening the file first
- Read unopened local files on demand so large-file preview does not depend on keeping the whole file open

### Good for

- Browsing large `.jsonl` log files from the start
- Jumping directly to a target record
- Comparing different file sections across multiple preview panels
- Inspecting structured logs, sampled data, and line-based JSON records

### Installation

1. Download `jsonl-line-preview-0.2.0.vsix`
2. In VS Code, run **Extensions: Install from VSIX...**
3. Select the downloaded `.vsix` file
```
