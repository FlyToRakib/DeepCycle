# DeepCycle Design System Skill

## 1. Color Palette

### 1.1 Core Colors
- **Brand Dark:** `#002719`
- **Brand Lime:** `#AEED22`

### 1.2 Light Mode (Default)
- **Background:** `#f3f4f6`
- **Card Background:** `#ffffff`
- **Surface:** `#f9fafb`
- **Text:** `#1f2937`
- **Text Muted:** `#6b7280`
- **Border:** `#e5e7eb`

### 1.3 Dark Mode
- **Background:** `#111827`
- **Card Background:** `#1f2937`
- **Surface:** `#374151`
- **Text:** `#f9fafb`
- **Text Muted:** `#9ca3af`
- **Border:** `#4b5563`

## 2. Typography
- **Primary Font:** `Inter`
- **Fallbacks:** `Roboto`, `sans-serif`
- **Weights:** Regular (400), Medium (500), Semi-Bold (600), Bold (700)
- **Base Sizes:**
  - Headings: `24px` for main titles, `16px` for H2, `14px` for H3.
  - Body Text: `14px`
  - Small Text / Footers: `11px` - `12px`

## 3. Layout & Spacing
- **Container Max Width:** `600px` (for full pages like options/analytics)
- **Border Radius:** `8px` (`var(--radius-md)`) for cards, `6px` for inputs/buttons.
- **Card Padding:** `24px`
- **Standard Margins:** `20px` to `24px` between major sections.

## 4. Component Specs
- **Action Buttons:** Neutral surface background with text color. Hover state becomes `--brand-lime` background with `#002719` text.
- **Inputs/Selects:** 10px padding, 6px border radius, 1px solid border matching the `--border` token. Focus state uses `--brand-lime` border.
- **Header:** Shared component with active/inactive tab links. Active tabs have a `--brand-lime` bottom border.
- **Footer:** Shared component with pipe-separated links, subtle opacity (0.3 - 0.45), and lime hover effects.

## 5. UI Rules
- Do NOT use generic placeholder colors; adhere strictly to the variables.
- Maintain the exact header/footer structures and styling.
- All dynamic states (hover, focus) should use `0.2s ease` transitions.
