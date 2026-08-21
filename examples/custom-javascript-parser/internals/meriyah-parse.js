"use strict";

const meriyah = require("meriyah");

/** @import { Program, Comment, SourceLocation } from "estree" */
/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../lib/javascript/JavascriptParser"
 */

/**
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const meriyahParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];

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
					: undefined
			})
		);

	return { ast, comments };
};

module.exports = meriyahParse;
