import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MermaidProvider, useMermaidContext } from './MermaidContext';

function Consumer() {
  const ctx = useMermaidContext();
  return (
    <div>
      <span data-testid="mode">{ctx.renderMode}</span>
      <span data-testid="drawer">{String(ctx.isDrawerOpen)}</span>
      <button type="button" onClick={() => ctx.setRenderMode('beautiful-svg')}>
        Set SVG
      </button>
      <button type="button" onClick={() => ctx.setDrawerOpen(true)}>
        Open drawer
      </button>
    </div>
  );
}

describe('MermaidProvider / useMermaidContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides default render mode', () => {
    render(
      <MermaidProvider>
        <Consumer />
      </MermaidProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('default');
  });

  it('updates render mode and persists to localStorage', async () => {
    render(
      <MermaidProvider>
        <Consumer />
      </MermaidProvider>,
    );
    const buttons = screen.getAllByText('Set SVG');
    buttons[0].click();
    await waitFor(() => {
      expect(localStorage.getItem('md-mermaid-render-mode')).toBe('beautiful-svg');
    });
    const modes = screen.getAllByTestId('mode');
    expect(modes.some((el) => el.textContent === 'beautiful-svg')).toBe(true);
  });

  it('updates drawer state', async () => {
    render(
      <MermaidProvider>
        <Consumer />
      </MermaidProvider>,
    );
    const drawers = screen.getAllByTestId('drawer');
    expect(drawers[0]).toHaveTextContent('false');
    screen.getAllByText('Open drawer')[0].click();
    await waitFor(() => {
      const updated = screen.getAllByTestId('drawer');
      expect(updated.some((el) => el.textContent === 'true')).toBe(true);
    });
  });

  it('throws when useMermaidContext used outside provider', () => {
    expect(() => render(<Consumer />)).toThrow('useMermaidContext must be used within a MermaidProvider');
  });
});
