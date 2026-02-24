import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mermaid } from './Mermaid';
import mermaid from 'mermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mocked</svg>', diagramType: 'flowchart' }),
  },
}));

const mockContext = {
  renderMode: 'default' as const,
  setRenderMode: vi.fn(),
  themeConfig: { preset: 'custom' as const, bg: '#000', fg: '#fff' },
  setThemeConfig: vi.fn(),
  isDrawerOpen: false,
  setDrawerOpen: vi.fn(),
  labelWrapAggressiveness: 'normal' as const,
  setLabelWrapAggressiveness: vi.fn(),
  copyImageFontSize: 'normal' as const,
  setCopyImageFontSize: vi.fn(),
};

vi.mock('../context/MermaidContext', () => ({
  useMermaidContext: () => mockContext,
}));

vi.mock('./DiagramActions', () => ({
  DiagramActions: () => <div data-testid="diagram-actions">Actions</div>,
}));

describe('Mermaid', () => {
  beforeEach(() => {
    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>mocked</svg>', diagramType: 'flowchart' });
    mockContext.renderMode = 'default';
  });

  it('renders default mermaid SVG when chart is valid', async () => {
    render(<Mermaid chart="graph TD\nA-->B" />);
    await screen.findByText(/mocked/, {}, { timeout: 2000 });
    const container = document.querySelector('.mermaid-container');
    expect(container?.innerHTML).toContain('<svg>');
  });

  it('renders diagram actions', async () => {
    render(<Mermaid chart="graph TD\nA-->B" />);
    expect(screen.getAllByTestId('diagram-actions').length).toBeGreaterThan(0);
  });

  it('renders error state for invalid chart in default mode', async () => {
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Parse error'));
    render(<Mermaid chart="invalid {{{" />);
    await screen.findByText(/Mermaid Error:/);
    expect(screen.getByText(/Parse error/)).toBeInTheDocument();
  });
});
