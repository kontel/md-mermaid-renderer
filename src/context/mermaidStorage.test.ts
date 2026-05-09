import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_THEME_CONFIG } from './themeConfig';
import {
  isValidRenderMode,
  isValidLabelWrap,
  isValidCopyImageFontSize,
  loadThemeConfig,
  RENDER_MODE_STORAGE_KEY,
  THEME_CONFIG_STORAGE_KEY,
  LABEL_WRAP_STORAGE_KEY,
  COPY_IMAGE_FONT_SIZE_STORAGE_KEY,
} from './mermaidStorage';

describe('mermaidStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isValidRenderMode', () => {
    it('accepts default, beautiful-svg, beautiful-ascii', () => {
      expect(isValidRenderMode('default')).toBe(true);
      expect(isValidRenderMode('beautiful-svg')).toBe(true);
      expect(isValidRenderMode('beautiful-ascii')).toBe(true);
    });
    it('rejects invalid or null', () => {
      expect(isValidRenderMode('foo')).toBe(false);
      expect(isValidRenderMode(null)).toBe(false);
      expect(isValidRenderMode('')).toBe(false);
    });
  });

  describe('isValidLabelWrap', () => {
    it('accepts compact, normal, wide', () => {
      expect(isValidLabelWrap('compact')).toBe(true);
      expect(isValidLabelWrap('normal')).toBe(true);
      expect(isValidLabelWrap('wide')).toBe(true);
    });
    it('rejects invalid or null', () => {
      expect(isValidLabelWrap('foo')).toBe(false);
      expect(isValidLabelWrap(null)).toBe(false);
    });
  });

  describe('isValidCopyImageFontSize', () => {
    it('accepts small, normal, large', () => {
      expect(isValidCopyImageFontSize('small')).toBe(true);
      expect(isValidCopyImageFontSize('normal')).toBe(true);
      expect(isValidCopyImageFontSize('large')).toBe(true);
    });
    it('rejects invalid or null', () => {
      expect(isValidCopyImageFontSize('foo')).toBe(false);
      expect(isValidCopyImageFontSize(null)).toBe(false);
    });
  });

  describe('loadThemeConfig', () => {
    it('returns default when storage empty', () => {
      const config = loadThemeConfig();
      expect(config).toEqual(DEFAULT_THEME_CONFIG);
      expect(config).toMatchObject({
        padding: 40,
        nodeSpacing: 24,
        layerSpacing: 40,
        componentSpacing: 24,
        interactive: false,
      });
    });
    it('merges stored JSON with defaults', () => {
      localStorage.setItem(THEME_CONFIG_STORAGE_KEY, JSON.stringify({ bg: '#ffffff', fg: '#000000' }));
      const config = loadThemeConfig();
      expect(config.bg).toBe('#ffffff');
      expect(config.fg).toBe('#000000');
      expect(config.preset).toBe(DEFAULT_THEME_CONFIG.preset);
    });
    it('returns default on invalid JSON', () => {
      localStorage.setItem(THEME_CONFIG_STORAGE_KEY, 'not json');
      const config = loadThemeConfig();
      expect(config).toEqual(DEFAULT_THEME_CONFIG);
    });
  });

  describe('storage keys', () => {
    it('exports expected key names', () => {
      expect(RENDER_MODE_STORAGE_KEY).toBe('md-mermaid-render-mode');
      expect(THEME_CONFIG_STORAGE_KEY).toBe('md-mermaid-theme-config');
      expect(LABEL_WRAP_STORAGE_KEY).toBe('md-mermaid-label-wrap');
      expect(COPY_IMAGE_FONT_SIZE_STORAGE_KEY).toBe('md-mermaid-copy-image-font-size');
    });
  });
});
