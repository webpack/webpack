"use strict";

const oxc = require("oxc-parser");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

/**
 * Oxc has no location or `onInsertedSemicolon` APIs — none are needed:
 * webpack derives line/column locations and inserted semicolons from node
 * offsets and the source text itself.
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const oxcParse = (sourceCode, options) => {
	const result = oxc.parseSync("file.js", sourceCode, {
		astType: "js",
		range: true,
		sourceType: options.sourceType === "module" ? "module" : "script",
		// @ts-expect-error no types
		experimentalRawTransfer: true
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
};

module.exports = oxcParse;
