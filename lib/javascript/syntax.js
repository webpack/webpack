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
/** @typedef {import("../util/SourceProcessor").PrintOptions} PrintOptions */
/**
 * @template T
 * @typedef {import("../util/SourceProcessor").VisitorMap<T>} VisitorMap
 */

/**
 * The parser half as webpack exposes it: parsing, and reading what a parse
 * wrote by path, with the tree and the parser classes kept inside webpack.
 * @typedef {Pick<SyntaxParser, "A" | "Field" | "Flag" | "NodeType" | "Part" | "fromEstreeObject" | "parseProgram" | "positionAt" | "toEstreeObject">} JavascriptSyntaxParser
 */

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {JavascriptSyntaxParser | undefined} */
let _publicParser;

/**
 * JavaScript's two halves, as `css` and `html` name theirs, are reached through
 * getters: parsing never loads the printer, nor the minifier behind it.
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));

/**
 * The parser's public face, read once off the parser half.
 * @returns {JavascriptSyntaxParser} what a plugin parses and reads through
 */
const publicParser = () => {
	if (_publicParser === undefined) {
		const {
			A,
			Field,
			Flag,
			NodeType,
			Part,
			fromEstreeObject,
			parseProgram,
			positionAt,
			toEstreeObject
		} = parser();
		_publicParser = {
			A,
			Field,
			Flag,
			NodeType,
			Part,
			fromEstreeObject,
			parseProgram,
			positionAt,
			toEstreeObject
		};
	}
	return _publicParser;
};

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the
 * JavaScript `grammar`, which walks the `SyntaxTree` a parse writes.
 * `process(src, { mode: "minify" })` returns `{ code, map }`, printed by the
 * same walk as `minify` prints a source it neither compresses nor mangles,
 * comments left out; without `mode` it only walks. Usage:
 *
 * ```
 * new JavascriptSourceProcessor().use({ [NodeType.CallExpression]: (path) => {} }).process(source, { sourceType: "module" });
 * ```
 * @experimental exposed as `webpack.javascript.syntax.SourceProcessor`; unstable API
 * @template [TState=unknown] what `process` hands every visitor as `path.state`
 * @extends {SourceProcessor<JavascriptPath, number, JavascriptProcessOptions, PrintOptions, AnyParts, TState, VisitorMap<JavascriptPath>>}
 */
class JavascriptSourceProcessor extends SourceProcessor {
	constructor() {
		// The printer is not named here but asked for on the first print, so a
		// walk that only fires visitors never loads it.
		super(
			parser().grammar,
			undefined,
			() => require("./syntax-printer").printer,
			parser().A
		);
	}
}

module.exports = {
	/** @returns {JavascriptSyntaxParser} the parser */
	get parser() {
		return publicParser();
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
