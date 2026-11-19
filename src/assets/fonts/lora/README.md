# Lora hero display font

- File: `lora-italic-variable.ttf`, variable italic weight 400–700.
- Source: [Google Fonts Lora family](https://github.com/google/fonts/tree/main/ofl/lora), downloaded 18 November 2026 from `Lora-Italic[wght].ttf` without modifying the font.
- License: SIL Open Font License 1.1, preserved in `OFL.txt`.
- Upstream: [Lora / Cyreal](https://github.com/cyrealtype/Lora-Cyrillic), including Vietnamese glyphs.
- Scope: `src/pages/customer/Home/hero-font.css` declares `Lora Hero`; only the Home hero heading uses this family. Other typography remains Geist.
- Bundled locally so runtime does not depend on installed system fonts or third-party font requests. Glyph coverage was checked for the complete Vietnamese heading; no missing characters.
