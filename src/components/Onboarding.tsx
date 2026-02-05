import { useState, useCallback } from 'react';

const DISMISSED_KEY = 'md-mermaid-onboarding-dismissed';

const steps = [
  {
    title: 'Write',
    description: 'Type or paste Markdown in the left pane. Headings, lists, tables, and code blocks all work.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: 'Add Diagrams',
    description: 'Use ```mermaid code blocks to create flowcharts, sequence diagrams, class diagrams, and more - no drawing tools needed.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="8.5" y="14" width="7" height="7" rx="1" />
        <path d="M6.5 10v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" /><path d="M12 12.5V14" />
      </svg>
    ),
  },
  {
    title: 'Copy & Share',
    description: 'Copy the entire preview or individual diagrams to your clipboard, then paste directly into Outlook, Word, or Confluence. Diagrams are automatically converted to images.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
];

export function Onboarding() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  if (dismissed) return null;

  return (
    <div className="onboarding" role="region" aria-label="Getting started">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <p className="onboarding-intro">
            Create documents with live diagrams. Write Markdown on the left, see the result on the right.
          </p>
          <button
            className="onboarding-close"
            onClick={handleDismiss}
            aria-label="Dismiss getting started guide"
          >
            &times;
          </button>
        </div>
        <div className="onboarding-steps">
          {steps.map((step) => (
            <div key={step.title} className="onboarding-step">
              <div className="onboarding-step-icon">{step.icon}</div>
              <div>
                <div className="onboarding-step-title">{step.title}</div>
                <div className="onboarding-step-desc">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="onboarding-footer">
          <span className="onboarding-hint">
            Hover over any diagram to copy or save it individually.
          </span>
          <button className="onboarding-dismiss-btn" onClick={handleDismiss}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
