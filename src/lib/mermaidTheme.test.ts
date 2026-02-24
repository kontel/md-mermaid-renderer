import { describe, it, expect } from 'vitest';
import { buildThemeOptions, computeBeautifulRender } from './mermaidTheme';
import type { ThemeConfig } from '../context/themeConfig';

describe('buildThemeOptions', () => {
  it('includes bg and fg from config', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#111', fg: '#eee' };
    expect(buildThemeOptions(config)).toEqual({ bg: '#111', fg: '#eee' });
  });

  it('adds optional keys when present', () => {
    const config: ThemeConfig = {
      preset: 'custom',
      bg: '#000',
      fg: '#fff',
      line: '#aaa',
      accent: '#f00',
      font: 'Inter',
    };
    const out = buildThemeOptions(config);
    expect(out.bg).toBe('#000');
    expect(out.fg).toBe('#fff');
    expect(out.line).toBe('#aaa');
    expect(out.accent).toBe('#f00');
    expect(out.font).toBe('Inter');
  });

  it('omits optional keys when undefined', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#000', fg: '#fff' };
    const out = buildThemeOptions(config);
    expect(out).toEqual({ bg: '#000', fg: '#fff' });
  });
});

describe('computeBeautifulRender', () => {
  it('returns empty result for default mode', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#000', fg: '#fff' };
    expect(computeBeautifulRender('graph TD\nA-->B', config, 'default')).toEqual({
      svg: '',
      ascii: '',
      error: null,
    });
  });

  it('returns empty result for empty chart', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#000', fg: '#fff' };
    expect(computeBeautifulRender('  \n  ', config, 'beautiful-svg')).toEqual({
      svg: '',
      ascii: '',
      error: null,
    });
  });

  it('returns SVG for beautiful-svg mode with valid chart', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#fff', fg: '#333' };
    const result = computeBeautifulRender('graph TD\nA-->B', config, 'beautiful-svg');
    expect(result.error).toBeNull();
    expect(result.svg).toContain('<svg');
    expect(result.ascii).toBe('');
  });

  it('returns ASCII for beautiful-ascii mode with valid chart', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#000', fg: '#fff' };
    const result = computeBeautifulRender('graph TD\nA-->B', config, 'beautiful-ascii');
    expect(result.error).toBeNull();
    expect(result.ascii.length).toBeGreaterThan(0);
    expect(result.svg).toBe('');
  });

  it('returns error for invalid chart', () => {
    const config: ThemeConfig = { preset: 'custom', bg: '#000', fg: '#fff' };
    const result = computeBeautifulRender('invalid syntax {{{', config, 'beautiful-svg');
    expect(result.error).toBeTruthy();
    expect(result.svg).toBe('');
    expect(result.ascii).toBe('');
  });
});
