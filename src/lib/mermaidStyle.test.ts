import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MERMAID_STYLE,
  MERMAID_STYLES,
  STYLE_TOKENS,
  buildMermaidStyleConfig,
  isValidMermaidStyle,
  mermaidStyle,
  sanitizeTokens,
  styleConfigKey,
} from './mermaidStyle';

describe('style presets', () => {
  it('has unique ids and a three-colour swatch each', () => {
    const ids = MERMAID_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const preset of MERMAID_STYLES) {
      expect(preset.label, `${preset.id} label`).not.toBe('');
      expect(preset.hint, `${preset.id} hint`).not.toBe('');
      expect(preset.swatch, `${preset.id} swatch`).toHaveLength(3);
      for (const colour of preset.swatch) {
        expect(colour, `${preset.id} swatch colour`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('only drives themeVariables from the base theme', () => {
    // Named mermaid themes hardcode their palette and ignore themeVariables.
    for (const preset of MERMAID_STYLES) {
      if (preset.themeVariables) {
        expect(preset.theme, `${preset.id} defines variables`).toBe('base');
      }
    }
  });

  it('uses the neo look for the neo and redux families', () => {
    for (const preset of MERMAID_STYLES) {
      if (preset.id.startsWith('neo') || preset.id.startsWith('redux')) {
        expect(preset.look, preset.id).toBe('neo');
      }
    }
  });

  it('falls back to the default for an unknown id', () => {
    expect(mermaidStyle('nope' as never).id).toBe(DEFAULT_MERMAID_STYLE);
  });
});

describe('isValidMermaidStyle', () => {
  it('accepts known ids and rejects everything else', () => {
    expect(isValidMermaidStyle('neo')).toBe(true);
    expect(isValidMermaidStyle('midnight')).toBe(true);
    expect(isValidMermaidStyle('nope')).toBe(false);
    expect(isValidMermaidStyle(null)).toBe(false);
  });
});

describe('sanitizeTokens', () => {
  it('drops unknown keys and blank values', () => {
    const clean = sanitizeTokens({
      primaryColor: '#fff',
      lineColor: '   ',
      somethingElse: '#000',
    });
    expect(clean).toEqual({ primaryColor: '#fff' });
  });

  it('trims values', () => {
    expect(sanitizeTokens({ lineColor: '  #abc  ' })).toEqual({ lineColor: '#abc' });
  });

  it('accepts every advertised token key', () => {
    const all = Object.fromEntries(STYLE_TOKENS.map((t) => [t.key, 'x']));
    expect(Object.keys(sanitizeTokens(all)).sort()).toEqual(STYLE_TOKENS.map((t) => t.key).sort());
  });
});

describe('buildMermaidStyleConfig', () => {
  it('passes the default style through untouched', () => {
    const config = buildMermaidStyleConfig('classic');
    expect(config.theme).toBe('default');
    expect(config.look).toBe('classic');
    expect(config.themeVariables).toEqual({});
  });

  it('keeps the named theme when there are no overrides', () => {
    expect(buildMermaidStyleConfig('redux-dark').theme).toBe('redux-dark');
    expect(buildMermaidStyleConfig('redux-dark').look).toBe('neo');
  });

  it('switches to the base theme once a token is overridden', () => {
    // Otherwise the named theme would ignore the variable and the control would
    // silently do nothing.
    const config = buildMermaidStyleConfig('redux-dark', { primaryColor: '#123456' });
    expect(config.theme).toBe('base');
    expect(config.themeVariables.primaryColor).toBe('#123456');
  });

  it('layers overrides on top of a studio preset', () => {
    const base = buildMermaidStyleConfig('midnight');
    const overridden = buildMermaidStyleConfig('midnight', { lineColor: '#ff0000' });

    expect(base.theme).toBe('base');
    expect(overridden.themeVariables.lineColor).toBe('#ff0000');
    // Untouched variables survive.
    expect(overridden.themeVariables.background).toBe(base.themeVariables.background);
  });

  it('ignores blank overrides so a cleared field inherits again', () => {
    const config = buildMermaidStyleConfig('neo', { primaryColor: '  ' });
    expect(config.theme).toBe('neo');
  });

  it('uses a fixed hand-drawn seed so exports are reproducible', () => {
    expect(buildMermaidStyleConfig('hand-drawn').look).toBe('handDrawn');
    expect(buildMermaidStyleConfig('hand-drawn').handDrawnSeed).toBe(
      buildMermaidStyleConfig('hand-drawn').handDrawnSeed,
    );
  });
});

describe('styleConfigKey', () => {
  it('is stable regardless of token insertion order', () => {
    expect(styleConfigKey('neo', { primaryColor: '#111', lineColor: '#222' })).toBe(
      styleConfigKey('neo', { lineColor: '#222', primaryColor: '#111' }),
    );
  });

  it('changes when the style or a token changes', () => {
    const base = styleConfigKey('neo', {});
    expect(styleConfigKey('midnight', {})).not.toBe(base);
    expect(styleConfigKey('neo', { lineColor: '#222' })).not.toBe(base);
  });

  it('ignores blank tokens', () => {
    expect(styleConfigKey('neo', { lineColor: '  ' })).toBe(styleConfigKey('neo', {}));
  });
});
