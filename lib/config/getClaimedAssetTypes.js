/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { matchObject } = require("../ModuleFilenameHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleFilenameHelpers").MatchObject} MatchObject */

/**
 * @param {unknown} candidate a configured plugin or minimizer entry
 * @param {string} file probe filename
 * @returns {boolean} whether the candidate minimizes that file
 */
const claims = (candidate, file) => {
	// Every minimizer in the `minimizer-webpack-plugin` family (itself,
	// `css-minimizer-webpack-plugin`, `html-minimizer-webpack-plugin`, …) keeps
	// its asset matcher on `options` in the shape `matchObject` reads. Anything
	// else — a plugin function, a plugin without options — is not a minimizer.
	const { options } = /** @type {{ options?: MatchObject }} */ (candidate);
	if (!options) return false;
	const { test, include, exclude } = options;
	// A matcher-less `options` is some other kind of plugin; passing it to
	// `matchObject` would match every file and claim everything.
	if (test === undefined && include === undefined && exclude === undefined) {
		return false;
	}
	return matchObject({ test, include, exclude }, file);
};

/**
 * Which asset types the user's own configuration already minimizes, so webpack's
 * default minimizer can leave those alone instead of racing the user's plugin
 * for them (the loser is skipped via `minimized` asset info, so without this
 * whichever tapped first would win). Deliberately coarse: it reads a plugin's
 * matcher rather than resolving it per emitted asset, so a minimizer scoped to a
 * subset still claims the whole type.
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
