/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Bits of `HtmlSyntaxTree#_minifyOptions`: the print's minifier options (see
// `HtmlProcessOptions`), resolved once per run. A set bit means the option is on.

// Whether this run is minifying, for the tests that run before `printer` does and
// have to predict what it will drop.
const MINIFY_MODE = 1 << 0;
const MINIFY_DEFER_SRCDOC = 1 << 1;
// The two reorderings, off unless asked for: neither changes what anything
// matches, but both change what a script reading `element.attributes` or
// `className` back sees.
const MINIFY_SORT_ATTRIBUTES = 1 << 2;
const MINIFY_SORT_TOKEN_LISTS = 1 << 3;
// Whether an empty `class` / `id` / `style` / `dir` may go, off unless asked
// for: a presence selector reads it.
const MINIFY_REMOVE_EMPTY_ATTRIBUTES = 1 << 4;
// Whether a childless, attribute-less element may go, off unless asked for: CSS
// can give one a size or a `::before`, and this cannot see the stylesheet.
const MINIFY_REMOVE_EMPTY_ELEMENTS = 1 << 5;
const MINIFY_REMOVE_SVG_METADATA = 1 << 6;
const MINIFY_REMOVE_SVG_EDITOR_DATA = 1 << 7;
const MINIFY_REMOVE_UNUSED_SVG_NAMESPACES = 1 << 8;
const MINIFY_SHORTEN_SVG_NUMBERS = 1 << 9;
const MINIFY_SHORTEN_SVG_TRANSFORM_FUNCTIONS = 1 << 10;
// Whether a transform list may be recomposed within the precision.
const MINIFY_CONVERT_SVG_TRANSFORMS = 1 << 11;
// Whether disjoint paths of any shape may merge, at a shared pixel's cost.
const MINIFY_MERGE_DISJOINT_SVG_PATHS = 1 << 12;
const MINIFY_SHORTEN_SVG_COLORS = 1 << 13;
const MINIFY_SHORTEN_SVG_PATH_DATA = 1 << 14;
// Whether a run of adjacent `<style>` elements prints as one, off unless asked
// for: it removes elements, which `document.styleSheets` and a `:nth-child`
// selector read.
const MINIFY_MERGE_STYLES = 1 << 15;
// Print a run of adjacent bare `<script>` elements as one.
const MINIFY_MERGE_SCRIPTS = 1 << 16;

module.exports.MINIFY_CONVERT_SVG_TRANSFORMS = MINIFY_CONVERT_SVG_TRANSFORMS;
module.exports.MINIFY_DEFER_SRCDOC = MINIFY_DEFER_SRCDOC;
module.exports.MINIFY_MERGE_DISJOINT_SVG_PATHS =
	MINIFY_MERGE_DISJOINT_SVG_PATHS;
module.exports.MINIFY_MERGE_SCRIPTS = MINIFY_MERGE_SCRIPTS;
module.exports.MINIFY_MERGE_STYLES = MINIFY_MERGE_STYLES;
module.exports.MINIFY_MODE = MINIFY_MODE;
module.exports.MINIFY_REMOVE_EMPTY_ATTRIBUTES = MINIFY_REMOVE_EMPTY_ATTRIBUTES;
module.exports.MINIFY_REMOVE_EMPTY_ELEMENTS = MINIFY_REMOVE_EMPTY_ELEMENTS;
module.exports.MINIFY_REMOVE_SVG_EDITOR_DATA = MINIFY_REMOVE_SVG_EDITOR_DATA;
module.exports.MINIFY_REMOVE_SVG_METADATA = MINIFY_REMOVE_SVG_METADATA;
module.exports.MINIFY_REMOVE_UNUSED_SVG_NAMESPACES =
	MINIFY_REMOVE_UNUSED_SVG_NAMESPACES;
module.exports.MINIFY_SHORTEN_SVG_COLORS = MINIFY_SHORTEN_SVG_COLORS;
module.exports.MINIFY_SHORTEN_SVG_NUMBERS = MINIFY_SHORTEN_SVG_NUMBERS;
module.exports.MINIFY_SHORTEN_SVG_PATH_DATA = MINIFY_SHORTEN_SVG_PATH_DATA;
module.exports.MINIFY_SHORTEN_SVG_TRANSFORM_FUNCTIONS =
	MINIFY_SHORTEN_SVG_TRANSFORM_FUNCTIONS;
module.exports.MINIFY_SORT_ATTRIBUTES = MINIFY_SORT_ATTRIBUTES;
module.exports.MINIFY_SORT_TOKEN_LISTS = MINIFY_SORT_TOKEN_LISTS;
