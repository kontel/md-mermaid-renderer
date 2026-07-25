import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { ChangelogPopup } from './ChangelogPopup';
import { hasSeenChangelog, markChangelogSeen } from '../lib/changelogStorage';
import { CHANGELOG_ENTRIES, CHANGELOG_VERSION } from '../content/changelog';

const STORAGE_KEY = 'md-mermaid-changelog-seen';

describe('ChangelogPopup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows on a first visit', () => {
    render(<ChangelogPopup />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(CHANGELOG_ENTRIES[0].title)).toBeInTheDocument();
  });

  it('lists every entry', () => {
    render(<ChangelogPopup />);
    for (const entry of CHANGELOG_ENTRIES) {
      expect(screen.getByText(entry.title)).toBeInTheDocument();
    }
  });

  it('stays hidden once dismissed for this version', () => {
    markChangelogSeen();
    render(<ChangelogPopup />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reappears when the version is bumped', () => {
    localStorage.setItem(STORAGE_KEY, '1999.01.01');
    render(<ChangelogPopup />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('records the dismissal so a reload stays quiet', async () => {
    render(<ChangelogPopup />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe(CHANGELOG_VERSION);
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('closes from the × button', async () => {
    render(<ChangelogPopup />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(hasSeenChangelog()).toBe(true);
  });

  it('closes on Escape', async () => {
    render(<ChangelogPopup />);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(hasSeenChangelog()).toBe(true);
  });

  it('never interrupts the standalone preview view', () => {
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, search: '?preview=true' },
      writable: true,
    });

    render(<ChangelogPopup />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('still shows when localStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(hasSeenChangelog()).toBe(false);
    render(<ChangelogPopup />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('does not throw when the dismissal cannot be stored', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    render(<ChangelogPopup />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /got it/i }))).not.toThrow();

    spy.mockRestore();
  });
});
