/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
/** @typedef {import("./syntax-parser").Node} Node */
/** @typedef {import("./syntax-parser").CssProcessOptions} CssProcessOptions */
/** @typedef {import("./syntax-parser").CssPath} CssPath */

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {SyntaxPrinter | undefined} */
let _printer;

// CSS's two halves, as `javascript` names theirs. Both are reached through
// a getter and remembered after the first read, so parsing never loads the
// printer and printing never loads the parser.
/**
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));
/**
 * @returns {SyntaxPrinter} the printer half
 */
const printer = () => _printer || (_printer = require("./syntax-printer"));

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the CSS
 * `grammar`. All configuration is per `process` call. `process(src, { minimize:
 * true })` returns `{ code, map }` — the safely-minified serialization (built by
 * the same walk that fires visitors) and its source map; without `minimize` it
 * just walks and returns `undefined`. Babel-style usage:
 *
 * ```
 * new SourceProcessor().use({ [NodeType.AtRule]: (path) => {} }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.css.syntax.SourceProcessor`; unstable API
 * @extends {GenericSourceProcessor<CssPath, Node, CssProcessOptions>}
 */
class SourceProcessor extends GenericSourceProcessor {
	constructor() {
		// The printer is not named here but asked for on the first print, so a
		// walk that only fires visitors never loads it.
		super(parser().grammar, undefined, () => printer().printer);
	}
}

module.exports = {
	/** @returns {SyntaxParser} the parser: what reads a source into nodes */
	get parser() {
		return parser();
	},
	/** @returns {SyntaxPrinter} the printer: what writes nodes back out */
	get printer() {
		return printer();
	},
	SourceProcessor
};
