/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const SourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
/** @typedef {import("./syntax-parser").JavascriptPath} JavascriptPath */
/** @typedef {import("./syntax-parser").JavascriptProcessOptions} JavascriptProcessOptions */
/** @typedef {import("../util/SourceProcessor").AnyParts} AnyParts */
/**
 * @template T
 * @typedef {import("../util/SourceProcessor").VisitorMap<T>} VisitorMap
 */

/** @type {SyntaxParser | undefined} */
let _parser;

/**
 * JavaScript's two halves, as `css` and `html` name theirs, are reached through
 * getters: parsing never loads the printer, nor the minifier behind it.
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the
 * JavaScript `grammar`, which walks the `SyntaxTree` a parse writes. It walks
 * only: there is no JavaScript node printer yet. Usage:
 *
 * ```
 * new JavascriptSourceProcessor().use({ [NodeType.CallExpression]: (path) => {} }).process(source, { sourceType: "module" });
 * ```
 * @experimental exposed as `webpack.javascript.syntax.SourceProcessor`; unstable API
 * @template [TState=unknown] what `process` hands every visitor as `path.state`
 * @extends {SourceProcessor<JavascriptPath, number, JavascriptProcessOptions, EXPECTED_OBJECT, AnyParts, TState, VisitorMap<JavascriptPath>>}
 */
class JavascriptSourceProcessor extends SourceProcessor {
	constructor() {
		super(parser().grammar, undefined, undefined, parser().A);
	}
}

module.exports = {
	/** @returns {SyntaxParser} the parser */
	get parser() {
		return parser();
	},
	/** @returns {SyntaxPrinter} the printer */
	get printer() {
		return require("./syntax-printer");
	},
	/** @returns {SyntaxParser["toEstreeObject"]} builds a node's ESTree object */
	get toEstreeObject() {
		return parser().toEstreeObject;
	},
	SourceProcessor: JavascriptSourceProcessor
};
