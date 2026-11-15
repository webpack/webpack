/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { isIdentifierChar } = require("./syntax").parser;

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { Range } from "./JavascriptParser" */

/**
 * Whether a char code continues an identifier, keyword or number, the `\`
 * of an escape included.
 * @param {number} code char code
 * @returns {boolean} true when it does
 */
const isWordCode = (code) => code === 92 || isIdentifierChar(code);

/**
 * Replaces a JavaScript expression's range with `text`, adding a space after
 * it where `text` would otherwise join a word the source kept apart from the
 * expression by punctuation, as in `import.meta["x"]in y`.
 * @param {ReplaceSource} source the module source
 * @param {Range} range the expression's range
 * @param {string} text the replacement
 * @returns {void}
 */
const replaceExpression = (source, range, text) => {
	const end = range[1];
	if (text.length > 0 && isWordCode(text.charCodeAt(text.length - 1))) {
		const original = source.original().source();
		if (
			typeof original === "string" &&
			end < original.length &&
			isWordCode(original.charCodeAt(end)) &&
			!isWordCode(original.charCodeAt(end - 1))
		) {
			text = `${text} `;
		}
	}
	source.replace(range[0], end - 1, text);
};

module.exports = replaceExpression;
