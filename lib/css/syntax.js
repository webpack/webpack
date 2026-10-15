/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
/** @typedef {typeof import("./syntax-options")} SyntaxOptions */
/** @typedef {import("./syntax-parser").CssParts} CssParts */
/**
 * @template [S=unknown]
 * @typedef {import("./syntax-parser").CssVisitorMap<S>} CssVisitorMap
 */
/** @typedef {import("./syntax-parser").Node} Node */
/** @typedef {import("./syntax-parser").CssProcessOptions} CssProcessOptions */
/** @typedef {import("./syntax-parser").CssPrintOptions} CssPrintOptions */
/** @typedef {import("./syntax-parser").CssPath} CssPath */

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {SyntaxPrinter | undefined} */
let _printer;
/** @type {SyntaxOptions | undefined} */
let _options;

// CSS's parser, printer and options are reached through getters and remembered
// after the first read, so reading options never loads the parser or printer.
/**
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));
/**
 * @returns {SyntaxPrinter} the printer half
 */
const printer = () => _printer || (_printer = require("./syntax-printer"));
/**
 * @returns {SyntaxOptions} the options helpers
 */
const options = () => _options || (_options = require("./syntax-options"));

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the CSS
 * `grammar`. All configuration is per `process` call. `process(src, { minimize:
 * true })` returns `{ code, map }` — the safely-minified serialization (built by
 * the same walk that fires visitors) and its source map; without `minimize` it
 * just walks and returns `undefined`. Usage:
 *
 * ```
 * new CssSourceProcessor().use({ [NodeType.AtRule]: (path) => {} }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.css.syntax.SourceProcessor`; unstable API
 * @template [TState=unknown] what `process` hands every visitor as `path.state`
 * @extends {SourceProcessor<CssPath, Node, CssProcessOptions, CssPrintOptions, CssParts, TState, CssVisitorMap<TState>>}
 */
class CssSourceProcessor extends SourceProcessor {
	constructor() {
		// The printer is not named here but asked for on the first print, so a
		// walk that only fires visitors never loads it.
		super(parser().grammar, undefined, () => printer().printer, parser().A);
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
	/** @returns {SyntaxOptions} the options helpers */
	get options() {
		return options();
	},
	SourceProcessor: CssSourceProcessor
};
