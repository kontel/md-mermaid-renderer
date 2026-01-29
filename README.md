# Markdown + Mermaid Renderer

A React SPA for rendering Markdown with inline Mermaid diagram support. Features a split-pane editor with live preview and PDF export capability.

## Features

- GitHub Flavored Markdown (GFM) support
- Inline Mermaid diagram rendering
- Multiple rendering options via [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid):
  - Default (mermaid.js) - standard SVG rendering
  - Beautiful Mermaid SVG - styled SVG output
  - Beautiful Mermaid ASCII - terminal-friendly text output
- Live preview with split-pane editor
- Open preview in separate tab for PDF export
- Render mode persisted to localStorage
- Print-friendly styling

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Usage

1. Write Markdown in the left editor pane
2. See live preview in the right pane
3. Use fenced code blocks with `mermaid` language for diagrams:

````markdown
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result]
    B -->|No| D[Other]
```
````

4. Select a rendering mode from the "Mermaid Renderer" dropdown in the header
5. Click "Open Preview in New Tab" to export as PDF via browser print

## Dependencies

| Package | Purpose |
|---------|---------|
| **react** | UI framework for building the component-based interface |
| **react-dom** | React renderer for web browsers |
| **react-markdown** | Converts Markdown strings into React components |
| **remark-gfm** | Plugin for react-markdown that adds GitHub Flavored Markdown support (tables, strikethrough, task lists, etc.) |
| **rehype-raw** | Plugin that allows raw HTML embedded in Markdown to pass through |
| **mermaid** | Renders diagram definitions (flowcharts, sequence diagrams, etc.) into SVG |
| **beautiful-mermaid** | Alternative mermaid renderer with SVG and ASCII output options |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| **vite** | Fast build tool and dev server with HMR |
| **typescript** | Type checking for JavaScript |
| **@vitejs/plugin-react** | Vite plugin for React Fast Refresh |
| **eslint** | Code linting |
