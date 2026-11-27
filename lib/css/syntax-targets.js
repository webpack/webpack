/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Bits of `SyntaxTree#_targetAllows`: what every browser a print targets
// reads, resolved once per print. A set bit means the target reads it.

const ALLOWS_HEX_ALPHA = 1 << 0;
const ALLOWS_DOUBLE_POSITION = 1 << 1;
const ALLOWS_DISPLAY_TWO_VALUES = 1 << 2;
const ALLOWS_SYSTEM_UI = 1 << 3;
const ALLOWS_TEXT_DECORATION_COLOR_STYLE = 1 << 4;
const ALLOWS_TEXT_DECORATION_THICKNESS = 1 << 5;
const ALLOWS_COLOR_FUNCTION = 1 << 6;
const ALLOWS_COLOR_MIX = 1 << 7;
const ALLOWS_HWB_COLORS = 1 << 8;
const ALLOWS_LAB_COLORS = 1 << 9;
const ALLOWS_LIGHT_DARK = 1 << 10;
const ALLOWS_WHERE_SELECTOR = 1 << 11;
// `:dir()`.
const ALLOWS_DIR_SELECTOR = 1 << 12;
// Nesting, so no rule is taken out of another.
const ALLOWS_NESTING = 1 << 13;
// `@custom-media`, so the rule naming one stays.
const ALLOWS_CUSTOM_MEDIA = 1 << 14;
const ALLOWS_IS_SELECTOR = 1 << 15;
const ALLOWS_LANG_ARGUMENT_LIST = 1 << 16;
const ALLOWS_NOT_SELECTOR_LIST = 1 << 17;
const ALLOWS_OKLAB_COLORS = 1 << 18;
// CSS Position 3 added `inset` long after the four longhands it merges, CSS 1.
const ALLOWS_INSET_SHORTHAND = 1 << 19;
const ALLOWS_RANGE_SPELLING = 1 << 20;
// CSS Box Alignment 3's `place-*`, newer than the `align-*` / `justify-*` pairs.
const ALLOWS_PLACE_SHORTHAND = 1 << 21;
// `overflow`'s two-value form (`overflow:auto hidden`), newer than the
// longhands it merges.
const ALLOWS_OVERFLOW_TWO_VALUES = 1 << 22;
// Every bit: what a print with no browser selection assumes.
const ALLOWS_ALL = (1 << 23) - 1;

module.exports.ALLOWS_ALL = ALLOWS_ALL;
module.exports.ALLOWS_COLOR_FUNCTION = ALLOWS_COLOR_FUNCTION;
module.exports.ALLOWS_COLOR_MIX = ALLOWS_COLOR_MIX;
module.exports.ALLOWS_CUSTOM_MEDIA = ALLOWS_CUSTOM_MEDIA;
module.exports.ALLOWS_DIR_SELECTOR = ALLOWS_DIR_SELECTOR;
module.exports.ALLOWS_DISPLAY_TWO_VALUES = ALLOWS_DISPLAY_TWO_VALUES;
module.exports.ALLOWS_DOUBLE_POSITION = ALLOWS_DOUBLE_POSITION;
module.exports.ALLOWS_HEX_ALPHA = ALLOWS_HEX_ALPHA;
module.exports.ALLOWS_HWB_COLORS = ALLOWS_HWB_COLORS;
module.exports.ALLOWS_INSET_SHORTHAND = ALLOWS_INSET_SHORTHAND;
module.exports.ALLOWS_IS_SELECTOR = ALLOWS_IS_SELECTOR;
module.exports.ALLOWS_LAB_COLORS = ALLOWS_LAB_COLORS;
module.exports.ALLOWS_LANG_ARGUMENT_LIST = ALLOWS_LANG_ARGUMENT_LIST;
module.exports.ALLOWS_LIGHT_DARK = ALLOWS_LIGHT_DARK;
module.exports.ALLOWS_NESTING = ALLOWS_NESTING;
module.exports.ALLOWS_NOT_SELECTOR_LIST = ALLOWS_NOT_SELECTOR_LIST;
module.exports.ALLOWS_OKLAB_COLORS = ALLOWS_OKLAB_COLORS;
module.exports.ALLOWS_OVERFLOW_TWO_VALUES = ALLOWS_OVERFLOW_TWO_VALUES;
module.exports.ALLOWS_PLACE_SHORTHAND = ALLOWS_PLACE_SHORTHAND;
module.exports.ALLOWS_RANGE_SPELLING = ALLOWS_RANGE_SPELLING;
module.exports.ALLOWS_SYSTEM_UI = ALLOWS_SYSTEM_UI;
module.exports.ALLOWS_TEXT_DECORATION_COLOR_STYLE =
	ALLOWS_TEXT_DECORATION_COLOR_STYLE;
module.exports.ALLOWS_TEXT_DECORATION_THICKNESS =
	ALLOWS_TEXT_DECORATION_THICKNESS;
module.exports.ALLOWS_WHERE_SELECTOR = ALLOWS_WHERE_SELECTOR;
