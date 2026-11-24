import { parseSync } from "@swc-next/parser";

/** @import { Program, Comment } from "estree" */
/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../lib/javascript/JavascriptParser.js"
 */

/**
 * SWC Next supplies source offsets. webpack uses them to derive line and
 * column locations and reads ASI positions from the source text.
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
export default function swcNextParse(sourceCode, options) {
	const result = parseSync(sourceCode, {
		semanticErrors: true,
		preserveParens: false,
		sourceType: options.allowReturnOutsideFunction
			? "commonjs"
			: options.sourceType,
		comments: options.comments ? "all" : "none"
	});

	const comments =
		/** @type {(Comment & { start: number, end: number })[]} */
		(result.comments);

	// webpack's magic-comment lookup reads `comment.range`
	for (const comment of comments) {
		if (!comment.range) comment.range = [comment.start, comment.end];
	}

	return {
		ast: /** @type {Program} */ (/** @type {unknown} */ (result.program)),
		comments
	};
}
