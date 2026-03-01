"use strict";

const meriyah = require("meriyah");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Node} Node */
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
const meriyahParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];
	/** @type {Semicolons} */
	const semicolons = new Set();

	const ast =
		/** @type {import("estree").Program} */
		(
			meriyah.parse(sourceCode, {
				...options,
				module: options.sourceType === "module",
				loc: options.locations,
				onComment: options.comments
					? (type, value, start, end, loc) => {
							if (type === "SingleLine" || type === "MultiLine") {
								comments.push({
									type: type === "SingleLine" ? "Line" : "Block",
									value,
									start,
									end,
									range: [start, end],
									loc
								});
							}
						}
					: undefined,
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

module.exports = meriyahParse;
