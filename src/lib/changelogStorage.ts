import { CHANGELOG_VERSION } from '../content/changelog';

const STORAGE_KEY = 'md-mermaid-changelog-seen';

/**
 * Dismissal is stored as the version that was dismissed, so bumping the version
 * re-shows the card once and an unchanged version stays quiet.
 *
 * Storage can throw outright in private mode or on a blocked origin, so both
 * helpers swallow failures: a what's-new card is never worth breaking boot over.
 */
export function hasSeenChangelog(version: string = CHANGELOG_VERSION): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === version;
  } catch {
    return false;
  }
}

export function markChangelogSeen(version: string = CHANGELOG_VERSION): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // Not remembering the dismissal is a smaller problem than crashing.
  }
}
