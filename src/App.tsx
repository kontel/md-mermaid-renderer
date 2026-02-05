import { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThemeDrawer } from './components/ThemeDrawer';
import { MermaidProvider, useMermaidContext } from './context/MermaidContext';
import type { MermaidRenderMode } from './context/MermaidContext';
import { copyPreview } from './utils/copyPreview';
import './App.css';

const STORAGE_KEY = 'md-mermaid-content';

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

function RenderModeSelector() {
  const { renderMode, setRenderMode } = useMermaidContext();

  return (
    <div className="render-mode-selector">
      <label htmlFor="render-mode">Mermaid Renderer:</label>
      <select
        id="render-mode"
        value={renderMode}
        onChange={(e) => setRenderMode(e.target.value as MermaidRenderMode)}
      >
        <option value="default">Default (mermaid.js)</option>
        <option value="beautiful-svg">Beautiful Mermaid (SVG)</option>
        <option value="beautiful-ascii">Beautiful Mermaid (ASCII)</option>
      </select>
    </div>
  );
}

function ThemeButton() {
  const { setDrawerOpen } = useMermaidContext();

  return (
    <button
      className="theme-btn-trigger"
      onClick={() => setDrawerOpen(true)}
      title="Theme Customization"
    >
      Theme
    </button>
  );
}

function CopyPreviewButton({ previewRef }: { previewRef: React.RefObject<HTMLDivElement | null> }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = async () => {
    if (!previewRef.current) return;
    try {
      await copyPreview(previewRef.current);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button
      className={`copy-preview-btn ${status !== 'idle' ? `copy-preview-btn--${status}` : ''}`}
      onClick={handleCopy}
    >
      {status === 'idle' && 'Copy Preview'}
      {status === 'copied' && 'Copied!'}
      {status === 'failed' && 'Failed'}
    </button>
  );
}

function AppContent() {
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
  const previewRef = useRef<HTMLDivElement>(null);

  const [markdown, setMarkdown] = useState(() => {
    if (isPreviewMode) {
      return localStorage.getItem(STORAGE_KEY) || defaultMarkdown;
    }
    return defaultMarkdown;
  });

  useEffect(() => {
    if (!isPreviewMode) {
      localStorage.setItem(STORAGE_KEY, markdown);
    }
  }, [markdown, isPreviewMode]);

  const openPreviewTab = () => {
    localStorage.setItem(STORAGE_KEY, markdown);
    window.open(`${window.location.origin}${window.location.pathname}?preview=true`, '_blank');
  };

  if (isPreviewMode) {
    return (
      <div className="preview-only">
        <MarkdownRenderer content={markdown} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Markdown + Mermaid Renderer</h1>
        <div className="header-controls">
          <RenderModeSelector />
          <ThemeButton />
          <button className="open-preview-btn" onClick={openPreviewTab}>
            Open Preview in New Tab
          </button>
        </div>
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
          <div className="pane-header">
            Preview
            <CopyPreviewButton previewRef={previewRef} />
          </div>
          <div className="preview" ref={previewRef}>
            <MarkdownRenderer content={markdown} />
          </div>
        </div>
      </main>
      <ThemeDrawer />
    </div>
  );
}

function App() {
  return (
    <MermaidProvider>
      <AppContent />
    </MermaidProvider>
  );
}

export default App;
