# Design System Inspired by Tableau

## 1. Visual Theme & Atmosphere

The Tableau design system embodies a minimalist, no-nonsense approach rooted in data visualization principles and enterprise software clarity. The visual language prioritizes legibility and functional hierarchy over decorative elements, creating a clean, professional environment where information takes center stage. The system employs a strict neutral palette anchored in black and white, reflecting Tableau's commitment to clarity and accessibility in data presentation. This austere aesthetic conveys confidence, reliability, and technical precision—qualities essential to an analytics platform trusted by enterprises. The typography is bold and commanding, particularly in headings, establishing clear visual dominance for key information. Generous whitespace and deliberate use of contrast ensure users can quickly parse content without cognitive overhead. Overall, the design evokes a sense of uncluttered professionalism where every pixel serves a communicative purpose.

**Key Characteristics**
- Monochromatic color foundation with black as the primary text element
- Clear typographic hierarchy using weight and scale differentiation
- Minimalist aesthetic with no extraneous visual ornamentation
- Enterprise-grade clarity and accessibility prioritization
- Generous whitespace and breathing room in layouts
- Bold, commanding typography for impact and legibility
- Functional design focused on data and content presentation

## 2. Color Palette & Roles

### Primary

- **Primary Text** (`#000000`): Primary heading and body text color used throughout the interface; establishes the foundational text hierarchy and readability standard

### Neutral Scale

- **Black** (`#000000`): Core text color, primary interface element, maximum contrast utility
- **White** (`#FFFFFF`): Default background color, providing clean canvas for content
- **Light Gray** (`#F5F5F5`): Subtle background surfaces, secondary container backgrounds
- **Medium Gray** (`#CCCCCC`): Divider lines, borders, disabled states
- **Dark Gray** (`#333333`): Secondary text, tertiary hierarchy levels

### Surface & Borders

- **Surface Background** (`#FFFFFF`): Main content area backgrounds
- **Border Color** (`#CCCCCC`): Subtle dividers and container edges

## 3. Typography Rules

### Font Family

Primary: `Times New Roman, serif`
Fallback stack: `Georgia, Garamond, serif`

Secondary: `Arial, sans-serif` (for UI elements and technical content)
Fallback stack: `Helvetica, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display | Times New Roman | 32px | 700 | 1.2 | 0px | Large headings, page titles, major sections |
| Heading 1 | Times New Roman | 28px | 700 | 1.3 | 0px | Section headers, primary content titles |
| Heading 2 | Times New Roman | 24px | 700 | 1.3 | 0px | Subsection headers, card titles |
| Heading 3 | Times New Roman | 20px | 700 | 1.3 | 0px | Minor section headers, emphasis text |
| Body | Times New Roman | 16px | 400 | 1.5 | 0px | Standard paragraph text, primary content |
| Body Small | Times New Roman | 14px | 400 | 1.4 | 0px | Secondary content, metadata, descriptions |
| Button | Arial | 14px | 600 | 1.2 | 0.5px | Call-to-action labels, interactive elements |
| Caption | Arial | 12px | 400 | 1.3 | 0px | Fine print, labels, footnotes |
| Code | Courier New | 12px | 400 | 1.4 | 0px | Technical content, error messages, references |

### Principles

- Serif typography (Times New Roman) anchors content and conveys authority and precision
- Weight contrast drives visual hierarchy: 700 for headings, 400 for body
- Line heights increase with smaller text sizes to maintain readability
- Sans-serif (Arial) reserved for UI controls and technical elements for clarity
- Generous line heights (1.4–1.5) support legibility and reduce cognitive load
- All-caps avoided in favor of title case to maintain approachability
- Letter spacing remains tight except for buttons, which receive subtle expansion for affordance

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background**: `#000000`
- **Text Color**: `#FFFFFF`
- **Padding**: `12px 24px`
- **Border Radius**: `0px`
- **Border**: `1px solid #000000`
- **Font Size**: `14px`
- **Font Weight**: `600`
- **Cursor**: `pointer`
- **Hover State**: Background `#333333`, Border `#333333`, slight lift via `box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)`
- **Active State**: Background `#1A1A1A`, text remains `#FFFFFF`
- **Disabled State**: Background `#CCCCCC`, Border `#CCCCCC`, Text `#666666`, Cursor `not-allowed`

#### Secondary Button
- **Background**: `#FFFFFF`
- **Text Color**: `#000000`
- **Padding**: `12px 24px`
- **Border Radius**: `0px`
- **Border**: `2px solid #000000`
- **Font Size**: `14px`
- **Font Weight**: `600`
- **Cursor**: `pointer`
- **Hover State**: Background `#F5F5F5`, Border `#000000`, `box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08)`
- **Active State**: Background `#EEEEEE`, Border `#000000`
- **Disabled State**: Border `#CCCCCC`, Text `#999999`, Background `#FFFFFF`, Cursor `not-allowed`

#### Ghost Button
- **Background**: `transparent`
- **Text Color**: `#000000`
- **Padding**: `8px 16px`
- **Border Radius**: `0px`
- **Border**: `1px solid transparent`
- **Font Size**: `14px`
- **Font Weight**: `600`
- **Cursor**: `pointer`
- **Hover State**: Border `1px solid #CCCCCC`, Background `#FAFAFA`
- **Active State**: Border `1px solid #999999`, Background `#F0F0F0`
- **Disabled State**: Text `#CCCCCC`, Cursor `not-allowed`

### Cards & Containers

#### Standard Card
- **Background**: `#FFFFFF`
- **Border**: `1px solid #CCCCCC`
- **Border Radius**: `0px`
- **Padding**: `20px`
- **Box Shadow**: `0 1px 2px rgba(0, 0, 0, 0.04)`
- **Margin Bottom**: `16px`

#### Elevated Card
- **Background**: `#FFFFFF`
- **Border**: `1px solid #CCCCCC`
- **Border Radius**: `0px`
- **Padding**: `24px`
- **Box Shadow**: `0 4px 8px rgba(0, 0, 0, 0.12)`

#### Alert Container
- **Background**: `#FFF3CD`
- **Border**: `1px solid #FFE69C`
- **Border Radius**: `0px`
- **Padding**: `16px`
- **Text Color**: `#856404`
- **Font Size**: `14px`

#### Error Container
- **Background**: `#F8D7DA`
- **Border**: `1px solid #F5C6CB`
- **Border Radius**: `0px`
- **Padding**: `16px`
- **Text Color**: `#721C24`
- **Font Size**: `14px`

### Inputs & Forms

#### Text Input
- **Background**: `#FFFFFF`
- **Border**: `1px solid #CCCCCC`
- **Border Radius**: `0px`
- **Padding**: `10px 12px`
- **Font Size**: `14px`
- **Color**: `#000000`
- **Focus State**: Border `2px solid #000000`, Outline `none`, Box Shadow `0 0 0 3px rgba(0, 0, 0, 0.05)`
- **Disabled State**: Background `#F5F5F5`, Color `#999999`, Border `#DDDDDD`, Cursor `not-allowed`

#### Text Input with Label
- **Label Font Size**: `12px`
- **Label Font Weight**: `600`
- **Label Color**: `#000000`
- **Label Margin Bottom**: `6px`
- **Label Display**: `block`

#### Select Dropdown
- **Background**: `#FFFFFF`
- **Border**: `1px solid #CCCCCC`
- **Border Radius**: `0px`
- **Padding**: `10px 12px`
- **Font Size**: `14px`
- **Color**: `#000000`
- **Cursor**: `pointer`
- **Hover State**: Border `1px solid #999999`
- **Focus State**: Border `2px solid #000000`, Box Shadow `0 0 0 3px rgba(0, 0, 0, 0.05)`

#### Checkbox
- **Width**: `16px`
- **Height**: `16px`
- **Border**: `1px solid #999999`
- **Border Radius**: `0px`
- **Background**: `#FFFFFF`
- **Cursor**: `pointer`
- **Checked State**: Background `#000000`, Border `#000000`
- **Focus State**: Box Shadow `0 0 0 2px rgba(0, 0, 0, 0.1)`

#### Radio Button
- **Width**: `16px`
- **Height**: `16px`
- **Border**: `1px solid #999999`
- **Border Radius**: `50%`
- **Background**: `#FFFFFF`
- **Cursor**: `pointer`
- **Checked State**: Border `4px solid #000000`, Background `#FFFFFF`
- **Focus State**: Box Shadow `0 0 0 2px rgba(0, 0, 0, 0.1)`

### Navigation

#### Primary Navigation Bar
- **Background**: `#FFFFFF`
- **Border Bottom**: `1px solid #CCCCCC`
- **Padding**: `16px 24px`
- **Height**: `60px`
- **Display**: `flex`
- **Align Items**: `center`

#### Navigation Link
- **Color**: `#000000`
- **Font Size**: `14px`
- **Font Weight**: `600`
- **Text Decoration**: `none`
- **Padding**: `8px 12px`
- **Border Radius**: `0px`
- **Hover State**: Color `#333333`, Background `#F5F5F5`
- **Active State**: Color `#000000`, Border Bottom `3px solid #000000`, Padding Bottom `5px`

#### Breadcrumb
- **Font Size**: `12px`
- **Color**: `#666666`
- **Separator**: ` / ` in `#999999`
- **Active Item Color**: `#000000`
- **Active Item Font Weight**: `600`

### Status & Semantic

#### Success Badge
- **Background**: `#D4EDDA`
- **Color**: `#155724`
- **Border**: `1px solid #C3E6CB`
- **Padding**: `4px 8px`
- **Font Size**: `12px`
- **Border Radius**: `0px`

#### Warning Badge
- **Background**: `#FFF3CD`
- **Color**: `#856404`
- **Border**: `1px solid #FFE69C`
- **Padding**: `4px 8px`
- **Font Size**: `12px`
- **Border Radius**: `0px`

#### Error Badge
- **Background**: `#F8D7DA`
- **Color**: `#721C24`
- **Border**: `1px solid #F5C6CB`
- **Padding**: `4px 8px`
- **Font Size**: `12px`
- **Border Radius**: `0px`

#### Info Badge
- **Background**: `#D1ECF1`
- **Color**: `#0C5460`
- **Border**: `1px solid #BEE5EB`
- **Padding**: `4px 8px`
- **Font Size**: `12px`
- **Border Radius**: `0px`

## 5. Layout Principles

### Spacing System

**Base Unit**: `8px`

**Scale**:
- `4px` – Fine adjustments, icon padding
- `8px` – Standard spacing between small elements
- `12px` – Internal component padding
- `16px` – Standard margin between elements
- `20px` – Card and container padding
- `24px` – Section spacing
- `32px` – Major section separation
- `40px` – Page-level spacing
- `48px` – Large container margins

**Usage Context**:
- **Tight**: `4px–8px` for icon spacing, inline element padding
- **Standard**: `16px–24px` for most vertical and horizontal spacing
- **Generous**: `32px–48px` for page sections and major layout divisions

### Grid & Container

- **Max Width**: `1200px` for standard content layouts
- **Container Padding**: `24px` on sides, adjusted to `16px` at tablet and `12px` on mobile
- **Column Strategy**: 12-column grid with `16px` gutter
- **Section Pattern**: Full-width background with centered content container inside; content max-width enforced independently

### Whitespace Philosophy

Whitespace is treated as a first-class design element. Generous margins and padding reduce cognitive load and create visual breathing room. Hierarchy is established through strategic whitespace reduction (tighter spacing) and expansion (looser spacing). Whitespace draws users' eyes to critical information and separates concerns between sections. No element should feel cramped; comfortable spacing enhances both aesthetics and usability.

### Border Radius Scale

- `0px` – Sharp corners; standard for enterprise components, buttons, cards, inputs, and navigation (geometric precision)
- `2px` – Subtle rounding for small UI elements (optional, rarely used)
- `50%` – Full circles for icons, avatars, and radio buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (L0) | No shadow | Base surfaces, page backgrounds, neutral states |
| Raised (L1) | `0 1px 2px rgba(0, 0, 0, 0.04)` | Standard cards, subtle hover states, minor depth |
| Lifted (L2) | `0 2px 4px rgba(0, 0, 0, 0.08)` | Interactive elements on hover, secondary cards, slight elevation |
| Elevated (L3) | `0 4px 8px rgba(0, 0, 0, 0.12)` | Modals, popovers, prominent cards, significant depth |
| Modal (L4) | `0 8px 16px rgba(0, 0, 0, 0.16)` | Overlays, dropdown menus, top-layer modals, maximum elevation |

**Shadow Philosophy**: Shadows are subtle and minimal, used sparingly to indicate layering and interactivity rather than dramatic depth effects. The system favors flat design with restrained elevation to maintain the clean, minimalist aesthetic. Shadows increase primarily on interactive hover states and for modal contexts where layering is essential. All shadows use black with low opacity to preserve the monochromatic palette and ensure subtle, professional appearance.

## 7. Do's and Don'ts

### Do

- **Use sharp corners** (`border-radius: 0px`) on all major components to maintain consistency and geometric precision
- **Prioritize monochromatic contrast** – leverage black, white, and grays for hierarchy and readability
- **Apply generous whitespace** between sections and around content to enhance scannability
- **Use bold typography weights** (700 for headings) to establish clear visual hierarchy
- **Maintain strong text contrast** – minimum 7:1 ratio for WCAG AAA compliance
- **Use serif fonts for body content** to convey authority and support longer text reading
- **Reserve sans-serif for UI controls** to maintain functional clarity
- **Apply subtle shadows only** for depth indication on cards and interactive states
- **Keep button padding consistent** at `12px 24px` across primary variants
- **Use the full color palette** for status indicators (success green, error red, warning amber, info blue)

### Don't

- **Don't use rounded corners** on main components; sharp corners are the system standard
- **Don't apply multiple shadows** simultaneously; stack only for extreme modal cases
- **Don't exceed 3 font sizes** in a single view without clear hierarchy justification
- **Don't use decorative elements** that don't serve an informational purpose
- **Don't pair serif body with sans-serif headings** in primary content areas
- **Don't crowd elements** with spacing less than `16px` between sections
- **Don't use color alone** for status indication; always include text labels or icons
- **Don't apply shadow effects** to inputs, buttons, or small UI components unless in hover/active states
- **Don't use small font sizes** below `12px` for critical content; maintain minimum `14px` for body
- **Don't mix alignment styles** within a section; maintain consistent text alignment (left-aligned preferred)

## 8. Responsive Behavior

### Breakpoints

| Breakpoint Name | Width | Key Changes |
|---|---|---|
| Mobile | 320px–639px | Single-column layout, full-width containers, padding reduced to `12px`, font sizes scaled down by 1–2px, button width 100%, stacked navigation |
| Tablet | 640px–1023px | Two-column grid available, container padding `16px`, standard font sizes, navigation becomes horizontal with collapsible sections |
| Desktop | 1024px–1439px | 12-column grid active, full width containers up to `1200px`, standard spacing and typography, multi-level navigation |
| Large Desktop | 1440px+ | Max container width enforced at `1200px`, centered on page, generous outer margins |

### Touch Targets

- **Minimum Height**: `44px` for all interactive elements on mobile
- **Minimum Width**: `44px` for touch buttons on mobile
- **Padding Around**: `8px` minimum between adjacent touch targets to prevent accidental activation
- **Button Touch Size**: `48px × 48px` recommended for mobile interfaces
- **Link Touch Size**: `40px × 40px` minimum for navigation links on mobile
- **Form Input Height**: `48px` on mobile for comfortable tap targets

### Collapsing Strategy

- **Navigation**: Hamburger menu (three horizontal lines) appears at `640px` breakpoint; slides in as off-canvas menu on mobile
- **Cards**: At tablet width, maintain two-column grid; collapse to single column at mobile
- **Sidebar**: Sidebar collapses into toggle drawer at `768px` breakpoint
- **Whitespace**: Reduce margins by 25% at tablet, 50% at mobile while maintaining visual separation
- **Typography**: Reduce Display size from `32px` to `28px` at tablet, `24px` at mobile
- **Containers**: Remove horizontal padding from full-width sections at mobile; apply edge-to-edge, with internal padding adjustment to `12px`

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA**: Black (`#000000`) background with white text
- **Secondary CTA**: White background with black border and black text
- **Background**: White (`#FFFFFF`)
- **Heading Text**: Black (`#000000`), weight 700
- **Body Text**: Black (`#000000`), weight 400
- **Border/Dividers**: Light Gray (`#CCCCCC`)
- **Disabled State**: Medium Gray (`#CCCCCC`)
- **Success**: `#D4EDDA` background, `#155724` text
- **Error**: `#F8D7DA` background, `#721C24` text
- **Warning**: `#FFF3CD` background, `#856404` text
- **Info**: `#D1ECF1` background, `#0C5460` text

### Iteration Guide

1. **All corners are sharp**: Apply `border-radius: 0px` to buttons, cards, inputs, navigation, and all standard components. Only use `border-radius: 50%` for avatars and radio buttons.

2. **Typography hierarchy is weight-based**: Use `font-weight: 700` for headings (Heading 1–3), `font-weight: 600` for buttons and UI labels, and `font-weight: 400` for body content. Font family is Times New Roman for content and Arial for controls.

3. **Spacing follows the 8px scale**: All margins and padding use multiples of 8px. Standard element spacing is `16px`, section spacing is `24px–32px`, and tight internal padding is `12px`.

4. **Buttons are consistent**: Primary buttons are `#000000` background with white text, padding `12px 24px`, no radius. Secondary buttons are white background with `2px solid #000000` border. Hover adds subtle shadow `0 2px 4px rgba(0, 0, 0, 0.1)` and darkened background.

5. **Monochromatic is strict**: Black (`#000000`), white (`#FFFFFF`), and grays only for neutral UI. Status colors (green, red, amber, blue) appear only in badges, alerts, and semantic containers, never in primary components.

6. **Line height increases with text size**: Body text is `16px / 1.5`, smaller text is `14px / 1.