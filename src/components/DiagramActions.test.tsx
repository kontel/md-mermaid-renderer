import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MermaidProvider } from '../context/MermaidContext';
import { DiagramActions } from './DiagramActions';

vi.mock('../utils/copyPreview', () => ({
  copyDiagramToClipboard: vi.fn().mockResolvedValue(undefined),
  saveDiagramAsFile: vi.fn().mockResolvedValue(undefined),
}));

function Wrapper({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  return (
    <MermaidProvider>
      <div ref={containerRef as React.RefObject<HTMLDivElement | null>}>diagram</div>
      <DiagramActions containerRef={containerRef} />
    </MermaidProvider>
  );
}

describe('DiagramActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Copy and Save buttons', () => {
    const ref = { current: document.createElement('div') };
    render(<Wrapper containerRef={ref} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls copyDiagramToClipboard when Copy clicked', async () => {
    const { copyDiagramToClipboard } = await import('../utils/copyPreview');
    const ref = { current: document.createElement('div') };
    render(<Wrapper containerRef={ref} />);
    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    copyButtons[0].click();
    expect(copyDiagramToClipboard).toHaveBeenCalledWith(ref.current, 'normal', 'normal');
  });

  it('shows Copied! after copy', async () => {
    const ref = { current: document.createElement('div') };
    render(<Wrapper containerRef={ref} />);
    screen.getAllByRole('button', { name: 'Copy' })[0].click();
    await screen.findByText('Copied!');
  });
});
