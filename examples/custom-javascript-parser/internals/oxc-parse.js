"use strict";

const oxc = require("oxc-parser");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

/**
 * @param {string} sourceCode source code
 * @returns {Set<number>} semicolons
 */
const collectSemicolons = (sourceCode) => {
	const semiSet = new Set();
	let pos = sourceCode.indexOf(";");

	while (pos !== -1) {
		semiSet.add(pos);
		pos = sourceCode.indexOf(";", pos + 1);
	}

	return semiSet;
};

/**
 * Oxc has no location API — none is needed: webpack derives line/column
 * locations from node offsets and the source text itself.
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const oxcParse = (sourceCode, options) => {
	// We need only automatic semicolon insertion position, but there is no API, so let's collect all semicolons
	// But there are rooms to improve it
	const semicolons = options.semicolons
		? collectSemicolons(sourceCode)
		: new Set();

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
		comments,
		semicolons
	};
};

module.exports = oxcParse;
