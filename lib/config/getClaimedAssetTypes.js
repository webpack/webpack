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
	if (typeof candidate !== "object" || candidate === null) return false;
	// Every minimizer in the `minimizer-webpack-plugin` family (itself,
	// `css-minimizer-webpack-plugin`, `html-minimizer-webpack-plugin`, …) keeps
	// its asset matcher on `options` in the shape `matchObject` reads.
	const options = /** @type {{ options?: MatchObject }} */ (candidate).options;
	if (typeof options !== "object" || options === null) return false;
	const { test, include, exclude } = options;
	// No matcher at all is some other kind of plugin, not a minimizer — an
	// all-undefined `matchObject` would match every file and claim everything.
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
	const candidates = [
		...(Array.isArray(optimization.minimizer) ? optimization.minimizer : []),
		...(Array.isArray(plugins) ? plugins : [])
	];
	let css = false;
	let html = false;
	for (const candidate of candidates) {
		if (!css && claims(candidate, "file.css")) css = true;
		if (!html && claims(candidate, "file.html")) html = true;
		if (css && html) break;
	}
	return { css, html };
};
