/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/**
 * A `minify` function for `minimizer-webpack-plugin` that drops the whitespace
 * between a JSON asset's tokens and keeps every token as written. Source that is
 * not valid JSON is returned unchanged rather than failing the build.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @returns {Promise<{ code: string }>} the minified JSON
 */
const jsonMinify = async (input) => {
	// WHY: the body is self-contained because the plugin ships this function to
	// its worker pool as source. Re-serializing through `JSON.parse` would round
	// `9007199254740993` to `…992` and turn `1e400` into `null`, so only the
	// whitespace goes; `JSON.parse` is asked solely whether the source is JSON.
	const [[, source]] = Object.entries(input);
	const code = typeof source === "string" ? source : source.toString("utf8");
	try {
		JSON.parse(code);
	} catch (_err) {
		return { code };
	}
	let result = "";
	let start = 0;
	let inString = false;
	for (let i = 0; i < code.length; i++) {
		const charCode = code.charCodeAt(i);
		if (inString) {
			// A backslash always escapes the one character after it.
			if (charCode === 92) i++;
			else if (charCode === 34) inString = false;
		} else if (charCode === 34) {
			inString = true;
		} else if (
			charCode === 32 ||
			charCode === 10 ||
			charCode === 13 ||
			charCode === 9
		) {
			result += code.slice(start, i);
			start = i + 1;
		}
	}
	return { code: result + code.slice(start) };
};

// Worker-safe (the body reaches nothing outside itself), so it may run in the
// shared worker-thread pool alongside terser.
jsonMinify.supportsWorkerThreads = () => true;

/**
 * The language this minifies, for a caller dispatching source that carries no
 * filename of its own.
 * @returns {string[]} the languages
 */
jsonMinify.getTypes = () => ["json"];

/**
 * @param {string} name asset filename
 * @returns {boolean} true for JSON assets, a web app manifest included
 */
jsonMinify.filter = (name) =>
	/^[^?#]*\.(?:json|webmanifest)(?:[?#].*)?$/i.test(name);

module.exports = jsonMinify;
