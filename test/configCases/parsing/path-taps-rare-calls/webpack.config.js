"use strict";

const acorn = require("acorn");

/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../../lib/javascript/JavascriptParser"
 */

/**
 * Parses with acorn, so the build walks a preparsed ESTree program.
 * @param {string} code source code
 * @param {ParseOptions} options parse options
 * @returns {ParseResult} parse result
 */
const parse = (code, options) => {
	/** @type {ParseResult["comments"]} */
	const comments = [];
	const ast = acorn.parse(code, {
		sourceType: options.sourceType,
		ecmaVersion: "latest",
		ranges: true,
		allowHashBang: true,
		onComment: /** @type {EXPECTED_ANY} */ (comments)
	});
	return { ast: /** @type {ParseResult["ast"]} */ (ast), comments };
};

/**
 * @param {boolean} preparsed whether the build parses with acorn
 * @returns {import("../../../../").Configuration} the configuration
 */
const config = (preparsed) => ({
	module: {
		parser: {
			javascript: preparsed ? { system: true, parse } : { system: true }
		}
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
