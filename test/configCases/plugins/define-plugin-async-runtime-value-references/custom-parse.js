"use strict";

const { parse } = require("acorn");

/** @import { Comment, SourceLocation } from "estree" */
/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../../lib/javascript/JavascriptParser"
 */

/**
 * Parses a rewritten source, so the text the plugin scans names one identifier
 * and the tree the parser walks names another.
 * @param {string} source the source code
 * @param {ParseOptions} options parse options
 * @returns {ParseResult} the parsed result
 */
const customParse = (source, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];
	const ast = /** @type {import("estree").Program} */ (
		/** @type {unknown} */ (
			parse(source.replace("PARSE_INPUT", "PARSE_VALUE"), {
				...options,
				ecmaVersion: "latest",
				onComment: comments
			})
		)
	);

	return { ast, comments };
};

module.exports = customParse;
