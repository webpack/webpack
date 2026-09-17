/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { matchObject } = require("../ModuleFilenameHelpers");

/** @import Compiler from "../Compiler" */
/** @import { MatchObject } from "../ModuleFilenameHelpers" */
/** @typedef {MatchObject & { minimizer?: EXPECTED_OBJECT }} MinimizerOptions */

/**
 * @param {unknown} candidate a configured plugin or minimizer entry
 * @param {string} file probe filename
 * @returns {boolean} whether the candidate minimizes that file
 */
const claims = (candidate, file) => {
	// Every minimizer in the `minimizer-webpack-plugin` family keeps its
	// implementation on `options.minimizer` and its matcher beside it. The matcher
	// alone would also catch `BannerPlugin` and friends, disabling minification.
	const { options } = /** @type {{ options?: MinimizerOptions }} */ (candidate);
	if (!options || !options.minimizer) return false;
	// `test` and `include` say which types it handles, while `exclude` only
	// narrows the files within them: honoring that narrowing would let a minimizer
	// scoped to a subdirectory claim nothing, and webpack would then race it.
	const { test, include } = options;
	return (
		(test !== undefined && matchObject({ test }, file)) ||
		(include !== undefined && matchObject({ include }, file))
	);
};

/**
 * Which asset types the user's own configuration already minimizes, so webpack's
 * default minimizer can leave those alone instead of racing the user's plugin
 * for them (the loser is skipped via `minimized` asset info, so without this
 * whichever tapped first would win). Deliberately coarse: it reads a plugin's
 * matcher rather than resolving it per emitted asset, so a minimizer restricted
 * to some of a type's files still claims the whole type.
 * @param {Compiler} compiler the compiler
 * @returns {{ css: boolean, html: boolean }} types another minimizer handles
 */
module.exports = (compiler) => {
	const { optimization, plugins } = compiler.options;
	let css = false;
	let html = false;
	// Both lists are normalized arrays with falsy entries already filtered out,
	// and `minimizer` was filled in by the defaults before any plugin applies.
	const minimizer =
		/** @type {NonNullable<typeof optimization.minimizer>} */
		(optimization.minimizer);
	for (const candidate of [...minimizer, ...plugins]) {
		if (!css) css = claims(candidate, "file.css");
		if (!html) html = claims(candidate, "file.html");
		if (css && html) break;
	}
	return { css, html };
};
