/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */

// JavaScript's two halves, as `css` and `html` name theirs: the parser a build
// reads source with, and the printer it writes minified source back out with.
// Reached through getters, so parsing never loads the printer — nor the
// minifier behind it — and printing never loads the parser.
module.exports = {
	/** @returns {SyntaxParser} the parser */
	get parser() {
		return require("./syntax-parser");
	},
	/** @returns {SyntaxPrinter} the printer */
	get printer() {
		return require("./syntax-printer");
	}
};
