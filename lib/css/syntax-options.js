/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/**
 * What the minifying printer may rewrite. Every entry is on unless it is
 * `false`, so a document one transform breaks can still be minified by the rest.
 * @typedef {object} CssTransformOptions
 * @property {boolean=} colorFallbacks write a color the target cannot read as an extra declaration before it, in a spelling it does read
 * @property {boolean=} lowerUnsupported write a spelling the target cannot read as one it can — the same value, said another way
 * @property {boolean=} foldCase write a name that matches ASCII case-insensitively — an at-rule, property, pseudo, function, unit or keyword — in lowercase
 * @property {boolean=} rewriteEscapes write an escaped identifier the shortest way that names it, wherever it stands
 * @property {(boolean | "all" | "some" | string | RegExp | ((comment: string) => boolean))=} comments which comments survive: `"some"` (the default) the ones that carry something, `true` / `"all"` every one, `false` none, or the ones a pattern matches / a predicate accepts, over the comment's own text
 * @property {boolean=} customMedia write the query a `@custom-media` names wherever a condition asks for it, and drop the rule that named it
 * @property {boolean=} customSelectors write the selector list a `@custom-selector` names as `:is(…)` wherever a selector asks for it, and drop the rule that named it
 * @property {boolean=} mergeLonghands write a family of longhands as the one shorthand that sets them
 * @property {boolean=} mergeRules join rules that print the same block, at-rules that share a prelude, and a named `@layer` block a later sibling opens again
 * @property {boolean=} normalizeQuotes normalize a string's, `url()`'s, font family's and attribute value's quoting
 * @property {boolean=} reduceFunctions compute a call into the shorter call naming the same value (`calc()` and the math functions, transforms, gradients, easing functions, filters)
 * @property {boolean=} removeDeadRules drop a rule or declaration nothing can read: an empty rule, and one an identical later one supersedes
 * @property {boolean=} reorderDeclarations print a style rule's declarations in one order by family, so blocks setting the same things read alike; only declarations whose order nothing can see move
 * @property {boolean=} rewriteDirSelector write a `:dir()` the target cannot read as the `[dir]` attribute selector, which reads the attribute rather than the directionality an element may inherit
 * @property {boolean=} shortenColors write each color in the shortest spelling of the same value
 * @property {boolean=} shortenMediaQueries write a media feature in its range spelling and collapse an `and` of two into the interval
 * @property {boolean=} shortenNumbers write each number in its shortest equal spelling
 * @property {boolean=} shortenSelectors rewrite a selector into a shorter equal one
 * @property {boolean=} shortenValues write a value the shortest way its property's own grammar allows
 */

// Every rewrite on, which is what a print with no `transforms` option makes.
/** @type {Required<CssTransformOptions>} */
const _ALL_TRANSFORMS = Object.freeze({
	colorFallbacks: true,
	lowerUnsupported: true,
	foldCase: true,
	rewriteEscapes: true,
	comments: "some",
	customMedia: false,
	customSelectors: false,
	mergeLonghands: true,
	mergeRules: true,
	normalizeQuotes: true,
	reduceFunctions: true,
	removeDeadRules: true,
	reorderDeclarations: true,
	rewriteDirSelector: false,
	shortenColors: true,
	shortenMediaQueries: true,
	shortenNumbers: true,
	shortenSelectors: true,
	shortenValues: true
});

/**
 * Selects transform options from a wider options object.
 * @param {CssTransformOptions} options an options object that may carry them
 * @returns {CssTransformOptions | undefined} the switches, or undefined when none is set
 */
const pickTransforms = (options) => {
	/** @type {CssTransformOptions | undefined} */
	let out;
	for (const name of Object.keys(_ALL_TRANSFORMS)) {
		const value = options[/** @type {keyof CssTransformOptions} */ (name)];
		if (value === undefined) continue;
		if (out === undefined) out = {};
		/** @type {{ [name: string]: CssTransformOptions[keyof CssTransformOptions] }} */ (
			out
		)[name] = value;
	}
	return out;
};

module.exports = {
	_ALL_TRANSFORMS,
	pickTransforms
};
