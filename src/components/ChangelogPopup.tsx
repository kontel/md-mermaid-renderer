import { useEffect, useState } from 'react';
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_TITLE,
  CHANGELOG_VERSION,
} from '../content/changelog';
import { hasSeenChangelog, markChangelogSeen } from '../lib/changelogStorage';

export function ChangelogPopup() {
  // Never show it in the standalone preview/PDF view.
  const isPreviewMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'true';

  const [open, setOpen] = useState(() => !isPreviewMode && !hasSeenChangelog());
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    markChangelogSeen();
    setLeaving(true);
    // Let the exit animation finish before unmounting.
    setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <aside
      className={`changelog-card ${leaving ? 'is-leaving' : ''}`}
      role="dialog"
      aria-label={CHANGELOG_TITLE}
    >
      <div className="changelog-header">
        <div className="changelog-title">
          <span className="changelog-sparkle" aria-hidden="true">
            ✨
          </span>
          <div>
            <h2>{CHANGELOG_TITLE}</h2>
            <p className="changelog-version">{CHANGELOG_VERSION}</p>
          </div>
        </div>
        <button
          type="button"
          className="changelog-close"
          onClick={dismiss}
          aria-label="Dismiss what's new"
        >
          &times;
        </button>
      </div>

      <ul className="changelog-list">
        {CHANGELOG_ENTRIES.map((entry) => (
          <li key={entry.title}>
            <span className="changelog-icon" aria-hidden="true">
              {entry.icon}
            </span>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" className="changelog-dismiss" onClick={dismiss}>
        Got it
      </button>
    </aside>
  );
}
