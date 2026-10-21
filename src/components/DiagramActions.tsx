import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useMermaidContext } from '../context/MermaidContext';
import { copyDiagramToClipboard, saveDiagramAsFile } from '../utils/copyPreview';

interface DiagramActionsProps {
  containerRef: React.RefObject<HTMLElement | null>;
  /** Extra per-diagram controls. Inside `.diagram-actions`, so copies strip them too. */
  children?: ReactNode;
}

export function DiagramActions({ containerRef, children }: DiagramActionsProps) {
  const { copyImageFontSize } = useMermaidContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');

  const onCopy = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await copyDiagramToClipboard(containerRef.current, copyImageFontSize);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, copyImageFontSize]);

  const onSave = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await saveDiagramAsFile(containerRef.current, copyImageFontSize);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, copyImageFontSize]);

  return (
    <div className="diagram-actions">
      <button type="button" className="diagram-actions-btn" onClick={onCopy} title="Copy as PNG">
        Copy
      </button>
      <button type="button" className="diagram-actions-btn" onClick={onSave} title="Save as PNG">
        Save
      </button>
      {children}
      <span className="diagram-actions-status" role="status" aria-live="polite">
        {status === 'copied' ? 'Copied!' : status === 'saved' ? 'Saved!' : ''}
      </span>
    </div>
  );
}
