# Changelog

All notable changes to the Markdown + Mermaid Renderer are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-02-05

### Added
- Dismissible onboarding guide for new users — explains Write, Add Diagrams, and Copy & Share workflows
- Diagram toolbar feedback now shows checkmark/X icons and text labels ("Copied", "Saved", "Failed") instead of color-only feedback
- Toolbar buttons are pill-shaped with smooth status transitions

## [1.3.0] - 2026-02-05

### Added
- Per-diagram copy and save buttons — hover over any diagram to reveal inline controls
- Copy a single diagram as a PNG image to the clipboard
- Save a single diagram as a PNG file download
- Toolbar auto-hides and appears on hover or focus

## [1.2.0] - 2026-02-05

### Added
- Copy preview to clipboard for pasting into Outlook, Word, and Confluence
- Three conversion strategies: Auto, SVG (fast), and DOM (pixel-perfect)
- Diagrams are converted to PNG at 2× retina resolution, capped at 600px wide
- Multiple diagrams are converted in parallel for faster processing
- Critical CSS is inlined for clipboard compatibility

### Improved
- Accessibility: ARIA labels, focus management, keyboard navigation, screen reader support
- Performance: `useMemo`/`useCallback` for stable context values, `React.memo` wrappers, module-level constant hoisting
- UX: simplified header layout, always-visible strategy selector, clearer button labels
- Fixed Mermaid ID conflicts when multiple diagrams are on the same page

## [1.1.0] - 2026-01-29

### Added
- Theme customization drawer with 15 built-in presets (light and dark themes)
- Custom color picker for background, foreground, line, accent, muted, surface, and border colors
- Font selection for diagram text
- Transparent background toggle
- Theme configuration persisted to localStorage

## [1.0.0] - 2026-01-28

### Added
- Beautiful Mermaid renderer integration with two additional modes:
  - Beautiful SVG — styled SVG output with customizable themes
  - Beautiful ASCII — terminal-friendly text output
- Renderer mode selector in the header
- Render mode persisted to localStorage

## [0.2.0] - 2026-01-24

### Added
- Preview-only mode for PDF export (via `?preview=true` URL parameter)
- "Open Preview" button to launch standalone preview in a new tab
- GitHub Pages deployment configuration

## [0.1.0] - 2026-01-24

### Added
- Split-pane Markdown editor with live preview
- GitHub Flavored Markdown (GFM) support via `remark-gfm`
- Inline Mermaid diagram rendering (flowcharts, sequence diagrams, class diagrams, and more)
- Syntax-highlighted code blocks
- Editor content persisted to localStorage
- Print-friendly styling
- Reduced motion support
