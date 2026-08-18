"use client";

import BotanicalMaterialStyles from "./BotanicalMaterialStyles";
import BotanicalShelfDecorStyles from "./BotanicalShelfDecorStyles";
import BotanicalDesignSystemStyles from "./BotanicalDesignSystemStyles";
import BotanicalReferenceCompositionStyles from "./BotanicalReferenceCompositionStyles";

/**
 * Single mounted style authority for the flagship Botanical theme.
 *
 * The internal order is deliberate and preserves the visually validated cascade:
 * material foundation -> shelf decor -> canonical design system -> final composition.
 * Keeping that order here prevents layout.tsx (and future feature work) from becoming
 * another place where Botanical patches can be inserted out of sequence.
 */
export default function BotanicalThemeStyles() {
  return <>
    <BotanicalMaterialStyles />
    <BotanicalShelfDecorStyles />
    <BotanicalDesignSystemStyles />
    <BotanicalReferenceCompositionStyles />

    {/* One physical grammar for generated art, cover crops, and fallback bindings.
        This is intentionally mounted at the theme boundary so the three spine
        pipelines cannot drift into visibly different book proportions again. */}
    <style>{`
      html[data-shelf-theme="botanical"] .book {
        width: var(--book-width) !important;
        min-width: var(--book-width) !important;
        max-width: var(--book-width) !important;
        height: 204px !important;
        min-height: 204px !important;
        max-height: 204px !important;
        border-radius: 6px 5px 3px 6px !important;
        transform: rotate(0deg) !important;
        transform-origin: 50% 100% !important;
        transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
        --generated-spine-width: var(--book-width) !important;
        --generated-spine-height: 204px !important;
        width: var(--book-width) !important;
        min-width: var(--book-width) !important;
        max-width: var(--book-width) !important;
        height: 204px !important;
        min-height: 204px !important;
        max-height: 204px !important;
        border-radius: 6px 5px 3px 6px !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover,
      html[data-shelf-theme="botanical"] .book:not(.has-cover),
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
        box-shadow:
          2px 6px 8px rgba(0,0,0,.30),
          1px 1px 1px rgba(0,0,0,.24),
          inset 3px 0 5px rgba(0,0,0,.14),
          inset -2px 0 3px rgba(0,0,0,.12),
          inset 1px 0 rgba(255,255,255,.12),
          0 3px 2px -2px rgba(8,4,2,.72) !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover .book-cover-art,
      html[data-shelf-theme="botanical"] .book.has-cover .generated-spine-art {
        filter: saturate(1.01) contrast(1.035) brightness(.96) !important;
      }

      html[data-shelf-theme="botanical"] .book:not(.has-cover) .book-title {
        font-size: 11px !important;
        line-height: 1.08 !important;
      }

      html[data-shelf-theme="botanical"] .book:not(.has-cover) .book-author {
        font-size: 7.5px !important;
        letter-spacing: .055em !important;
      }

      html[data-shelf-theme="botanical"] .book:hover,
      html[data-shelf-theme="botanical"] .book:focus-visible,
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"]:hover,
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"]:focus-visible {
        transform: translateY(-5px) rotate(0deg) !important;
        filter: brightness(1.025) !important;
        box-shadow:
          3px 10px 13px rgba(0,0,0,.34),
          1px 1px 1px rgba(0,0,0,.24),
          inset 3px 0 5px rgba(0,0,0,.12),
          inset -2px 0 3px rgba(0,0,0,.10),
          inset 1px 0 rgba(255,255,255,.13),
          0 4px 2px -2px rgba(8,4,2,.72) !important;
      }

      @media (max-width: 760px) {
        html[data-shelf-theme="botanical"] .book,
        html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
          height: 200px !important;
          min-height: 200px !important;
          max-height: 200px !important;
          --generated-spine-height: 200px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html[data-shelf-theme="botanical"] .book {
          transition: none !important;
        }
      }
    `}</style>
  </>;
}
