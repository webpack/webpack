"use strict";

const meriyah = require("meriyah");

/** @typedef {import("estree").Comment & { start: number, end: number, loc: import("estree").SourceLocation }} Comment */

/**
 * @param {string} sourceCode the source code
 * @param {import("../../lib/javascript/JavascriptParser").ParseOptions} options options
 * @returns {{ ast: import("estree").Program, comments: Comment[], semicolons: Set<number> }} the parsed result
 */
const parse = (sourceCode, options) => {
	/** @type {Comment[]} */
	const comments = [];
	/** @type {Set<number>} */
	const semicolons = new Set();
	/**
	 * @param {number} pos a position of semicolon
	 * @returns {Set<number>} set with semicolon positions
	 */
	const onInsertedSemicolon = (pos) => semicolons.add(pos);
	const parseOptions = {
		...options,
		module: options.sourceType === "module",
		loc: options.locations,
		onComment: options.comments ? comments : undefined,
		onInsertedSemicolon: options.semicolons ? onInsertedSemicolon : undefined
	};
	// @ts-expect-error wrong types for comments
	const ast = meriyah.parse(sourceCode, parseOptions);

	// @ts-expect-error wrong types AST
	return { ast, comments, semicolons };
};

/** @type {import("webpack").Configuration} */
const config = {
	mode: "production",
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	module: {
		// Global override
		parser: {
			javascript: {
				parse
			}
		}
		// Override on the module level, only for modules which match the `test`
		// rules: [
		// 	{
		// 		test: /\.js$/,
		// 		parser: {
		// 			parse
		// 		}
		// 	}
		// ]
	}
};

module.exports = config;
