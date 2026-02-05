import { useState, useEffect, useRef, memo } from 'react';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThemeDrawer } from './components/ThemeDrawer';
import { MermaidProvider, useMermaidContext } from './context/MermaidContext';
import type { MermaidRenderMode } from './context/MermaidContext';
import { copyPreview } from './utils/copyPreview';
import type { CopyStrategy } from './utils/copyPreview';
import './App.css';

const STORAGE_KEY = 'md-mermaid-content';

const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';

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

const RenderModeSelector = memo(function RenderModeSelector() {
  const { renderMode, setRenderMode, setDrawerOpen } = useMermaidContext();
  const isBeautiful = renderMode === 'beautiful-svg' || renderMode === 'beautiful-ascii';

  return (
    <div className="render-mode-selector">
      <label htmlFor="render-mode">Renderer:</label>
      <select
        id="render-mode"
        value={renderMode}
        onChange={(e) => setRenderMode(e.target.value as MermaidRenderMode)}
        title="Choose how Mermaid diagrams are rendered"
      >
        <option value="default">Default (mermaid.js)</option>
        <option value="beautiful-svg">Beautiful SVG</option>
        <option value="beautiful-ascii">Beautiful ASCII</option>
      </select>
      {isBeautiful && (
        <button
          className="theme-btn-trigger"
          onClick={() => setDrawerOpen(true)}
          title="Customize diagram colors and fonts"
        >
          Theme
        </button>
      )}
    </div>
  );
});

const CopyPreviewButton = memo(function CopyPreviewButton({ previewRef }: { previewRef: React.RefObject<HTMLDivElement | null> }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [strategy, setStrategy] = useState<CopyStrategy>('auto');

  const handleCopy = async () => {
    if (!previewRef.current) return;
    try {
      await copyPreview(previewRef.current, strategy);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  const statusLabel = status === 'idle' ? 'Copy Preview' : status === 'copied' ? 'Copied!' : 'Failed';

  return (
    <div className="copy-preview-group">
      <button
        className={`copy-preview-btn ${status !== 'idle' ? `copy-preview-btn--${status}` : ''}`}
        onClick={handleCopy}
        title="Copy preview as rich HTML with diagrams as images"
      >
        {statusLabel}
      </button>
      <select
        className="copy-strategy-select"
        value={strategy}
        onChange={(e) => setStrategy(e.target.value as CopyStrategy)}
        title="How diagrams are converted to images for pasting"
        aria-label="Diagram conversion strategy"
      >
        <option value="auto">Auto</option>
        <option value="svg-pipeline">SVG (fast)</option>
        <option value="dom-capture">DOM (pixel-perfect)</option>
      </select>
      <span aria-live="polite" className="sr-only">
        {status === 'copied' ? 'Preview copied to clipboard' : status === 'failed' ? 'Copy failed' : ''}
      </span>
    </div>
  );
});

function AppContent() {
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
  }, [markdown]);

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
        <h1>Markdown + Mermaid</h1>
        <div className="header-controls">
          <RenderModeSelector />
          <div className="header-divider" />
          <CopyPreviewButton previewRef={previewRef} />
          <div className="header-divider" />
          <button
            className="open-preview-btn"
            onClick={openPreviewTab}
            title="Open a standalone preview tab for PDF export"
          >
            Open Preview
          </button>
        </div>
      </header>
      <main className="main">
        <div className="editor-pane">
          <label htmlFor="markdown-editor" className="pane-header">Editor</label>
          <textarea
            id="markdown-editor"
            className="editor"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Enter your markdown here..."
            spellCheck={false}
          />
        </div>
        <div className="preview-pane">
          <div className="pane-header">Preview</div>
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
