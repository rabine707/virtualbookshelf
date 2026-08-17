# Shelf of Fame — DESIGN.md

> Visual source of truth for Shelf of Fame.
>
> **Core idea:** A real, moody library that happens to be interactive — not a bookshelf app decorated to look like a library.

This document governs visual and interaction work across the project. It is inspired by the DESIGN.md methodology: atmosphere, tokens, typography, components, layout, depth, responsive behavior, and explicit guardrails live together so design decisions are not re-invented feature by feature.

---

## 1. Visual Theme & Atmosphere

Shelf of Fame should feel like entering a private residential library at the best hour of the day: dark forest-green walls, dimensional walnut shelving, soft daylight entering from the left, aged brass catching small highlights, cream paper and typography, and restrained living greenery framing the collection.

The bookshelf is the product. The room is the stage.

The experience should be:

- immersive rather than dashboard-like
- tactile rather than flat
- editorial rather than SaaS
- warm and shadowed rather than orange-filtered
- sophisticated rather than ornate
- realistic enough to feel materially believable without requiring full 3D rendering
- calm enough that hundreds of colorful books remain the visual focus

### Flagship benchmark

The **Botanical** theme is the flagship visual benchmark for scene quality. Other themes may reinterpret materials and props, but they should preserve the same standards for depth, hierarchy, legibility, restraint, and book-first composition.

### First viewport target

On desktop, aim for roughly:

- **30% atmosphere + navigation + utility UI**
- **70% visible bookshelf / collection**

Do not allow a large hero, empty wall, oversized title, or decorative scene to push the actual shelf below the fold.

---

## 2. Design Principles

### 2.1 Books first

The collection must dominate. Architecture and decor frame the books; they never become the main interaction surface.

### 2.2 Material realism over decorative effects

Depth should come from believable material cues: thickness, edge highlights, contact shadows, occlusion, directional light, texture, and layering. Avoid fake depth produced by randomly rotating objects, excessive blur, large generic shadows, or glossy gradients.

### 2.3 UI belongs in the room

Controls should visually disappear into the environment when idle. Search, theme controls, account controls, counts, and book actions must remain clearly usable, but should not look like unrelated white web-app cards floating over the scene.

### 2.4 Atmosphere is directional

Daylight originates from the **left side** of the scene. Shadows and highlights should agree with that direction. Lamps may add localized warm pools of light, but there should be no global amber/orange wash.

### 2.5 Restraint

Use a small material and color vocabulary repeatedly. Aged brass is special because it is sparse. Sage is useful because it is quiet. Cream works because it is not everywhere.

### 2.6 Scale indefinitely

The visual system must continue working with 300+ books and beyond. Decorative treatments must not require bespoke manual placement for every shelf row.

---

## 3. Color Palette & Roles

These are the target roles for the flagship Botanical experience. Existing implementation values may vary slightly while the UI is migrated; new visual work should converge toward these roles rather than introduce unrelated colors.

### Room and dark surfaces

- **Forest Wall — `#17251D`**: primary room green
- **Forest Deep — `#0C1710`**: deep room surface / cinematic backdrop
- **Shadow Green — `#071009`**: deepest ambient shadow
- **Raised Green — `#223328`**: subtle elevated green control surface

### Wood

- **Walnut Dark — `#29170F`**: shelf cavity / deepest wood
- **Walnut — `#51301F`**: structural wood midtone
- **Walnut Warm — `#70462D`**: selectively lit wood
- **Wood Highlight — `#B08059`**: sparing edge reflection, never a flat fill

### Text and paper

- **Cream — `#E7DFC9`**: primary text on dark surfaces
- **Cream Bright — `#F4EDDF`**: high-emphasis text / selected title
- **Parchment Muted — `#BDB29A`**: secondary copy
- **Ink — `#241B16`**: text on light paper-like surfaces

### Accent materials

- **Sage — `#889580`**: quiet controls, selected utility states, subtle focus
- **Sage Dark — `#61705F`**: pressed/hovered sage
- **Aged Brass — `#9A7544`**: lamps, premium accents, tiny highlights
- **Brass Light — `#C3A06A`**: specular highlight only

### Semantic colors

Use conventional semantic colors for error/success/warning when necessary, but desaturate them enough to live inside the room. Semantic clarity takes priority over atmosphere.

### Color rules

- Never use pure white as a large Botanical surface.
- Never use bright green as a generic CTA just because the room is green.
- Brass is not a general-purpose button color.
- Avoid introducing unrelated blue/purple gradients in core shelf UI.
- Use transparency to integrate controls into the scene, not to create glassmorphism.

---

## 4. Typography

Typography should feel editorial and literary without becoming costume-gothic.

### Primary literary face

Until a curated project font is explicitly added, use:

`Georgia, "Times New Roman", serif`

Use for:

- Shelf of Fame title
- book titles in detail views
- major section headings
- selective empty-state/editorial moments

### Utility face

Use a quiet system sans for controls and metadata:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Do not introduce a webfont dependency merely to satisfy this fallback stack.

### Hierarchy

- **Display:** 44–64px desktop, serif, 500–600, tight line-height
- **H1:** 34–46px, serif, 500–600
- **H2:** 26–34px, serif, 500–600
- **H3:** 20–24px, serif or restrained sans depending on context
- **Body:** 15–17px, readable line-height 1.45–1.6
- **Utility:** 13–15px, sans, 500–650
- **Metadata:** 11–13px, sans, slightly increased letter spacing only when useful

### Typography rules

- Cream serif headings over dark room surfaces are preferred.
- Do not use huge marketing-site typography that competes with the shelf.
- Do not use faux-vintage typefaces for ordinary controls.
- Avoid excessive ALL CAPS. Reserve it for tiny utility labels/eyebrows.
- Book spine artwork is artwork; do not normalize genuine/generated spine typography into the global UI type system.

---

## 5. Scene Composition

Treat the page as a layered environment.

### Back layer

1. room wall / plaster texture
2. architectural trim
3. window / exterior light source
4. broad daylight falloff

### Middle layer

5. bookcase frame
6. shelf backs / cabinet interior
7. structural shelf boards
8. localized lamps and wall fixtures
9. books

### Front layer

10. restrained plants and foreground props
11. chair or major furniture when compositionally useful
12. subtle grain / vignette / atmospheric overlays

### Interface layer

13. navigation
14. search and utility controls
15. book hover/focus/selection states
16. drawers, dialogs, menus, account surfaces

### Layering rules

- A decorative foreground object may overlap architecture but must not block core book interactions.
- Ambient overlays must be `pointer-events: none`.
- The shelf must remain readable even if cinematic assets fail to load.
- Scene pieces must have explicit z-index intent. Do not escalate z-index values randomly to fix collisions.
- Prefer a documented stacking context over a z-index arms race.

---

## 6. Lighting & Depth

### Natural light

- Main daylight comes from the **left**.
- Use a broad soft source, not a circular glow pasted over the page.
- Left-facing edges may receive a restrained warm/neutral highlight.
- Right/deep cavity regions should fall into cooler/darker green-brown shadow.

### Lamps

- Brass fixtures should produce small localized pools of warm light.
- Light should visibly affect the nearest wall, shelf edge, or object.
- Do not add glowing lamps with no environmental spill.

### Shelves

Shelf boards must communicate physical thickness through:

- a brighter upper edge
- a darker vertical/front face
- contact shadow beneath the board
- darker cavity corners
- subtle side occlusion
- wood texture aligned with the shelf direction

Books should feel seated on a shelf, not pasted onto a wood-colored rectangle.

### Shadows

Prefer multiple restrained cues to one giant drop shadow.

- contact shadow: short, dark, precise
- ambient shadow: broad, low-opacity
- cavity shadow: inset / occlusion
- directional cast shadow: aligned with the left light source

---

## 7. Books & Shelf Behavior

### Books are data-bearing objects

A book is not decorative scenery. It must remain selectable, searchable, focusable, and scalable across a large collection.

### Spine art

- Genuine/generated/uploaded spine artwork is canonical when available.
- Do not replace approved spine art with CSS approximations simply because CSS is easier.
- Preserve readable title/author metadata when artwork is unavailable.
- Avoid fake random book leans as a primary realism technique.
- Slight variation is acceptable only when it does not hurt scanning or make the shelf messy.

### Shelf rows

- Repeating modular rows are intentional and necessary for scale.
- Hide repetition through lighting, subtle material variation, and sparse decor — not through inconsistent geometry.
- Shelf geometry should stay stable as book count changes.

### Interaction

- Single tap/click is the default activation model.
- Hover is enhancement, never the only way to discover essential information.
- Focus states must remain visible against dark/wood surfaces.
- On mobile, prioritize reliable taps over delicate hover-inspired behavior.

---

## 8. Components

### Search / toolbar

Target: quiet utility integrated into the library.

- dark translucent green/brown surface or scene-integrated treatment
- thin low-contrast border
- cream primary text
- muted parchment placeholder/secondary text
- sage focus/active cue
- compact height; do not consume the first viewport
- avoid bright white inputs in Botanical

### Buttons

#### Primary action

Use only when an action truly needs emphasis.

- deep ink/forest or restrained cream-on-dark treatment
- modest radius, approximately 8–14px
- subtle material-aware shadow if elevated
- short 140–220ms transition

#### Secondary action

- transparent or low-opacity surface
- thin low-contrast border
- cream/sage text
- hover may slightly brighten the surface or border

#### Icon/utility action

- small hit target surface that can disappear visually when idle
- minimum touch target 44px on mobile

Avoid universal pill buttons. Pills may be used for compact metadata/status only.

### Cards / panels / dialogs

Panels should feel like dark lacquered wood, deep green painted cabinetry, or warm paper depending on context.

Avoid:

- white SaaS cards
- blue-gray admin panels
- glass cards with heavy blur
- floating rectangles with no relationship to the room

Use substantial overlays/dialogs when clarity requires them; atmosphere must never make forms unreadable.

### Book detail surfaces

Preferred hierarchy:

1. cover/spine artwork
2. book title in literary serif
3. author
4. collection/status metadata
5. actions

The panel should feel like opening a catalog drawer or examining a book in the library, not viewing a generic product card.

---

## 9. Botanical Architecture — Current Canonical Implementation

The current Botanical experience already has dedicated scene and material layers. Preserve and evolve them rather than rebuilding the room from generic global CSS.

Key files include:

- `app/BotanicalSceneEnricher.tsx` — cinematic scene portals, header/shelf assets, window light/rays, grain, vignette, foreground
- `app/BotanicalMaterialStyles.tsx` — plaster and wood material treatment, shelf depth, directional daylight
- `app/BotanicalLightingStyles.tsx` — Botanical lighting behavior
- `app/BotanicalPropStyles.tsx` — scene/decor treatment
- `app/BotanicalLampFixStyles.tsx` — lamp refinements
- `app/BotanicalAssetEnricher.tsx` — Botanical asset enrichment
- `app/ThemeEnricher.tsx` — theme selection and per-theme decor behavior

### Architecture rule

New Botanical visual work should prefer changes within the scoped Botanical system rather than adding broad unscoped overrides to `app/globals.css`.

The legacy/classic global stylesheet may remain for non-Botanical behavior, but its beige paper cards, light backgrounds, and old bookcase treatment are **not** the Botanical design reference.

---

## 10. Asset Policy

### Approved/generated scene assets are first-class

If an approved window, chair, plant, cabinet, lamp, shelf-back, header plate, or other scene asset exists, use that asset unless there is a concrete technical or visual reason not to.

Do **not** silently replace a high-quality raster/vector asset with a crude CSS drawing.

### Asset requirements

- maintain useful transparency where appropriate
- preserve aspect ratio
- avoid stretching photography/material textures unnaturally
- crop intentionally for viewport role
- use responsive image sizing where practical
- decorative assets should not receive accessibility focus
- performance matters: scene richness must not make scrolling hundreds of books sluggish

### External textures

External texture sources may be used when licensing and reliability are appropriate, but core visual identity should progressively move toward project-owned assets so the room does not depend indefinitely on third-party availability.

---

## 11. Layout & Spacing

Use a restrained 4px-based spacing rhythm:

- 4px — micro
- 8px — compact
- 12px — control interior
- 16px — standard
- 24px — group separation
- 32px — major UI separation
- 48px — scene/section separation
- 64px+ — only when the shelf remains visible enough

### Desktop

- allow lush side decor and richer scene layering
- keep primary reading/interaction zone centered on the books
- use asymmetry for atmosphere; do not mirror every plant/lamp/object

### Tablet

- reduce edge decor before reducing book usability
- simplify overlaps that become visually cramped
- preserve search and main navigation

### Mobile

Mobile is not a shrunken desktop room.

Priority order:

1. books
2. search/add/navigation
3. book interaction
4. essential atmosphere
5. optional decor

Remove or simplify nonessential scene elements before shrinking books or touch targets to unusable sizes.

---

## 12. Responsive Behavior

### Breakpoint philosophy

Use content pressure rather than arbitrary device names, but existing `760px` behavior is a practical project boundary and may continue where appropriate.

### Mobile requirements

- minimum practical touch target: 44 × 44px
- no interaction that requires hover
- fixed bottom navigation must not cover actionable shelf content
- dialogs must fit within safe-area insets
- text must remain readable without zoom
- shelf rows should preserve a coherent physical structure
- decorative overlays may be disabled if they obscure content or hurt performance

---

## 13. Motion

Motion should be quiet and physical.

Preferred:

- 140–220ms control transitions
- slight lift/highlight for a selected book
- gentle dialog/menu entrance
- subtle lamp/light ambience only if inexpensive

Avoid:

- bouncy spring motion everywhere
- large parallax that fights scrolling
- constant floating decor
- random book wobble
- cinematic animation that delays access to the collection

Respect `prefers-reduced-motion`.

---

## 14. Accessibility

Atmosphere never overrides usability.

- maintain WCAG-conscious text contrast
- preserve visible keyboard focus
- decorative scene assets are hidden from assistive technology when appropriate
- do not encode status only by color
- dialogs need proper roles, focus handling, escape behavior, and readable surfaces
- allow text to reflow without clipping
- use meaningful labels for icon-only controls

---

## 15. Do / Don't Guardrails

### DO

- make shelves feel physically dimensional
- let light fall across books and architecture consistently
- integrate UI into the room
- use walnut, forest green, cream, sage, and aged brass with discipline
- keep books visually dominant
- preserve approved generated/real assets
- use asymmetric decor to frame the collection
- keep repeating shelf modules scalable
- scope theme-specific CSS to the theme
- check desktop and mobile after visual changes

### DON'T

- create large flat green rectangles behind shelf rows
- use bright-white SaaS cards in the Botanical room
- default to glassmorphism
- fake realism by randomly rotating every book
- make every decorative object interactive
- replace approved assets with crude CSS approximations
- apply a global orange/vintage filter
- add huge marketing hero blocks above the shelf
- introduce unrelated visual languages while fixing one component
- use `!important` as the first solution to every conflict
- solve stacking problems by endlessly increasing z-index
- sacrifice book scalability for one handcrafted screenshot

---

## 16. Implementation Rules for Agents

Before making a visual change:

1. Read this file.
2. Identify whether the change is global, theme-specific, or component-specific.
3. Preserve functional behavior unless the task explicitly changes it.
4. Reuse existing approved assets and scene architecture before creating substitutes.
5. Prefer the narrowest correctly scoped style change.
6. Check whether the change works with a large number of books.
7. Check desktop and mobile behavior.
8. Run project validation appropriate to the change.

### Specific code guidance

- Botanical overrides should use `html[data-shelf-theme="botanical"]` or an equally narrow scope.
- Avoid adding new global selectors for a one-theme fix.
- Prefer CSS variables/tokens for repeated design values.
- Preserve the existing theme selector contract from `ThemeEnricher.tsx`.
- Decorative scene layers should remain non-interactive.
- Do not remove a fallback merely because cinematic assets currently load successfully.
- When several historical style layers target the same element, consolidate deliberately instead of stacking another patch whenever practical.

---

## 17. Visual Acceptance Checklist

A major visual change is acceptable when:

- [ ] the first viewport still prominently shows the bookshelf
- [ ] the result reads as a room/library before it reads as a dashboard
- [ ] books remain the strongest content signal
- [ ] the left-side daylight direction is visually coherent
- [ ] shelf boards have believable thickness and contact shadow
- [ ] controls are usable without becoming bright floating cards
- [ ] approved scene/spine assets remain respected
- [ ] desktop feels lush without clutter
- [ ] mobile intentionally simplifies nonessential scenery
- [ ] keyboard focus and text contrast remain usable
- [ ] the change scales to hundreds of books
- [ ] no unrelated theme has been accidentally restyled

---

## 18. Agent Prompt Guide

When implementing Shelf of Fame UI, use this mental prompt:

> Build this as part of a real moody residential library. The collection is the product and the room is the stage. Use deep forest-green walls, dimensional walnut, cream literary typography, restrained sage controls, aged brass accents, and believable left-side daylight. Integrate UI into the environment instead of placing generic SaaS cards over it. Preserve approved scene and spine artwork. Keep the bookshelf dominant, scalable to hundreds of books, and intentionally simplified on mobile.

When uncertain between two visual approaches, choose the one that makes the interface feel **more like a believable library and less like a themed dashboard**, provided usability remains strong.
