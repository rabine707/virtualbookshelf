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
  </>;
}
