/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
/** @typedef {import("./syntax-parser").HtmlNodeRef} HtmlNodeRef */
/** @typedef {import("./syntax-parser").HtmlPath} HtmlPath */
/** @typedef {import("./syntax-printer").HtmlProcessOptions} HtmlProcessOptions */

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {SyntaxPrinter | undefined} */
let _printer;

// HTML's two halves, as `javascript` names theirs. Both are reached through
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
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the HTML
 * `grammar`. Babel-style usage:
 *
 * ```
 * new SourceProcessor().use({ [NodeType.Element]: (path) => {}, [NodeType.Comment]: { enter, exit } }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.html.syntax.SourceProcessor`; unstable API
 * @extends {GenericSourceProcessor<HtmlPath, HtmlNodeRef, HtmlProcessOptions>}
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
