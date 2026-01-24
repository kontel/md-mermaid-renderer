import { useState } from 'react';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import './App.css';

const defaultMarkdown = `# Markdown with Mermaid Demo

This is a **markdown** renderer with support for *inline* Mermaid diagrams.

## Features

- GitHub Flavored Markdown
- Mermaid diagram rendering
- Live preview

## Flowchart Example

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant Server
    User->>App: Enter markdown
    App->>App: Parse & render
    App->>Server: Save document
    Server-->>App: Confirmation
    App-->>User: Display preview
\`\`\`

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table Example

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Mermaid | ✅ |
| GFM | ✅ |

## Class Diagram

\`\`\`mermaid
classDiagram
    class MarkdownRenderer {
        +content: string
        +render(): void
    }
    class Mermaid {
        +chart: string
        +render(): SVG
    }
    MarkdownRenderer --> Mermaid : uses
\`\`\`
`;

function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);

  return (
    <div className="app">
      <header className="header">
        <h1>Markdown + Mermaid Renderer</h1>
      </header>
      <main className="main">
        <div className="editor-pane">
          <div className="pane-header">Editor</div>
          <textarea
            className="editor"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Enter your markdown here..."
            spellCheck={false}
          />
        </div>
        <div className="preview-pane">
          <div className="pane-header">Preview</div>
          <div className="preview">
            <MarkdownRenderer content={markdown} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
