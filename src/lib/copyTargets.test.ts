import { describe, it, expect } from 'vitest';
import {
  COPY_TARGETS,
  COPY_TARGET_PROFILES,
  copyTargetProfile,
  isValidCopyTarget,
} from './copyTargets';

describe('isValidCopyTarget', () => {
  it('accepts known targets', () => {
    expect(isValidCopyTarget('email')).toBe(true);
    expect(isValidCopyTarget('confluence')).toBe(true);
  });

  it('rejects unknown values and null', () => {
    expect(isValidCopyTarget('slack')).toBe(false);
    expect(isValidCopyTarget(null)).toBe(false);
    expect(isValidCopyTarget('toString')).toBe(false);
  });
});

describe('copy target profiles', () => {
  it('exposes every target in the picker order', () => {
    expect([...COPY_TARGETS].sort()).toEqual(Object.keys(COPY_TARGET_PROFILES).sort());
  });

  it('gives every HTML target a root style and a label', () => {
    for (const target of COPY_TARGETS) {
      const profile = copyTargetProfile(target);
      expect(profile.label).not.toBe('');
      expect(profile.hint).not.toBe('');
      if (profile.emitsHtml) {
        expect(profile.rootStyle).toContain('font-family');
        expect(profile.rules.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every block-level rule an explicit bottom margin', () => {
    // Targets reset margins to their own defaults, so spacing has to travel inline.
    for (const target of COPY_TARGETS) {
      const profile = copyTargetProfile(target);
      if (!profile.emitsHtml) continue;
      for (const selector of ['p', 'ul, ol', 'blockquote']) {
        const rule = profile.rules.find(([s]) => s === selector);
        expect(rule, `${target} is missing a rule for ${selector}`).toBeDefined();
        // Shorthand or longhand, as long as a bottom gap is stated. The email
        // profile must use longhand — Word discards the shorthand.
        expect(rule![1]).toMatch(/margin(-bottom)?:[^;]*/);
      }
    }
  });
});

describe('email profile', () => {
  const email = copyTargetProfile('email');

  it('uses only fonts installed on a recipient machine', () => {
    expect(email.rootStyle).not.toContain('BlinkMacSystemFont');
    const mono = email.rules.find(([s]) => s === '.code-block')![1];
    expect(mono).toContain('Courier New');
    expect(mono).not.toContain('Fira Code');
  });

  it('keeps code blocks light so forced dark mode cannot invert them', () => {
    const code = email.rules.find(([s]) => s === '.code-block')![1];
    expect(code).toContain('background-color:#f6f8fa');
    expect(code).toContain('white-space:pre-wrap');
  });

  it('carries Word-specific hints CSSOM would reject', () => {
    expect(email.rootStyle).toContain('mso-line-height-rule');
  });

  it('caps diagrams at a width an email body can show', () => {
    expect(email.maxImageWidth).toBe(600);
    expect(email.tableAttributes).toBe(true);
  });
});

describe('confluence profile', () => {
  const confluence = copyTargetProfile('confluence');

  it('stays structural: no backgrounds or fixed table width to fight the page theme', () => {
    expect(confluence.structuralOnly).toBe(true);
    expect(confluence.zebraStripe).toBeNull();
    const table = confluence.rules.find(([s]) => s === 'table')![1];
    expect(table).not.toContain('width:100%');
    const code = confluence.rules.find(([s]) => s === '.code-block')![1];
    expect(code).not.toContain('background');
  });

  it('wraps diagrams in a paragraph rather than a styled panel', () => {
    expect(confluence.figure.tag).toBe('p');
  });
});

describe('markdown profile', () => {
  it('is plain text only', () => {
    expect(copyTargetProfile('markdown').emitsHtml).toBe(false);
  });
});
