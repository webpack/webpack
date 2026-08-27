---
"webpack": minor
---

Minify CSS further, only where the document is unchanged: shorthands and box longhands, `font-weight`, `<position>` and `font-stretch` keywords, colors (polar, Lab and `hsl()` converted to hex), numbers, times, zero units, `calc()` and every math function the spec names folded over constants, selector lists, An+B, keyframe selectors, media-feature ranges, `unicode-range`, `transition` layers, `display`, transforms, gradients, font families, identical repeated declarations, and rules an identical later one makes dead. Abilities are read off the target browsers, `vendorPrefixes` adds and drops vendor prefixes for them, and `rewriteCustomProperties` shortens custom property values. Minification never changes whether a declaration parses, and beautifying keeps every rule.
