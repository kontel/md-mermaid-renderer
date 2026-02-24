import { useCallback, useState } from 'react';
import { useMermaidContext } from '../context/MermaidContext';
import { copyDiagramToClipboard, saveDiagramAsFile } from '../utils/copyPreview';

interface DiagramActionsProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function DiagramActions({ containerRef }: DiagramActionsProps) {
  const { labelWrapAggressiveness, copyImageFontSize } = useMermaidContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');

  const onCopy = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await copyDiagramToClipboard(containerRef.current, labelWrapAggressiveness, copyImageFontSize);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, labelWrapAggressiveness, copyImageFontSize]);

  const onSave = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await saveDiagramAsFile(containerRef.current, 'diagram.png', labelWrapAggressiveness, copyImageFontSize);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, labelWrapAggressiveness, copyImageFontSize]);

  return (
    <div className="diagram-actions">
      <button type="button" className="diagram-actions-btn" onClick={onCopy} title="Copy as PNG">
        Copy
      </button>
      <button type="button" className="diagram-actions-btn" onClick={onSave} title="Save as PNG">
        Save
      </button>
      {status === 'copied' && <span className="diagram-actions-status">Copied!</span>}
      {status === 'saved' && <span className="diagram-actions-status">Saved!</span>}
    </div>
  );
}
