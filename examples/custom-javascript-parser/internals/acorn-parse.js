"use strict";

const acorn = require("acorn");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */
/** @typedef {Set<number>} Semicolons */

/**
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const acornParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];
	/** @type {Semicolons} */
	const semicolons = new Set();

	const ast =
		/** @type {import("estree").Program} */
		(
			acorn.parse(sourceCode, {
				...options,
				onComment: options.comments ? comments : undefined,
				onInsertedSemicolon: options.semicolons
					? // Set semicolons
						/**
						 * @param {number} pos a position of semicolon
						 * @returns {Semicolons} set with semicolon positions
						 */
						(pos) => semicolons.add(pos)
					: undefined
			})
		);

	return { ast, comments, semicolons };
};

module.exports = acornParse;
