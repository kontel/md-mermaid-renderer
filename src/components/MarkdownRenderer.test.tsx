import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

vi.mock('./Mermaid', () => ({
  Mermaid: ({ chart }: { chart: string }) => <div data-testid="mermaid">{chart}</div>,
}));

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders markdown body wrapper', () => {
    render(<MarkdownRenderer content="hello" />);
    const body = document.querySelector('.markdown-body');
    expect(body).toBeInTheDocument();
  });

  it('renders paragraph text', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders mermaid block for fenced mermaid code', () => {
    render(
      <MarkdownRenderer content={'```mermaid\ngraph TD\nA-->B\n```'} />,
    );
    const mermaidEl = screen.getByTestId('mermaid');
    expect(mermaidEl).toBeInTheDocument();
    expect(mermaidEl.textContent).toContain('graph TD');
    expect(mermaidEl.textContent).toContain('A-->B');
  });

  it('renders non-mermaid code block with code-block class', () => {
    render(<MarkdownRenderer content={'```js\nconst x = 1;\n```'} />);
    const pre = document.querySelector('.code-block');
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain('const x = 1');
  });

  it('renders inline code with inline-code class', () => {
    render(<MarkdownRenderer content="Use `inline` code." />);
    const code = document.querySelector('.inline-code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent('inline');
  });
});
