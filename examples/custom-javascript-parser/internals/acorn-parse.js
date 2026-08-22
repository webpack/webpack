"use strict";

const acorn = require("acorn");

/** @import { Comment, SourceLocation } from "estree" */
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
const acornParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];

	const ast =
		/** @type {import("estree").Program} */
		(
			acorn.parse(sourceCode, {
				...options,
				onComment: options.comments ? comments : undefined
			})
		);

	return { ast, comments };
};

module.exports = acornParse;
