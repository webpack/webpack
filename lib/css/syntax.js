/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SourceProcessor = require("../util/SourceProcessor");

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
 * The compressed size a stylesheet is served at, for comparing two spellings:
 * zlib's default level, the one most servers compress with.
 * @param {string} code the stylesheet
 * @returns {number} its size deflated
 */
const compressedSize = (code) =>
	require("zlib").deflateRawSync(code, { level: 6 }).length;

/**
 * Whether printing a minified stylesheet's declarations grouped is worth a second
 * print, read off the first: the regrouped text compresses smaller by more than
 * a thousandth, below which the bytes gained do not pay for the print.
 * @param {string} code the stylesheet as first printed
 * @returns {boolean} true to print it again grouped
 */
const groupingPays = (code) => {
	const grouped = parser()._regroupDeclarations(code);
	if (grouped === code) return false;
	const written = compressedSize(code);
	return compressedSize(grouped) < written - written / 1000;
};

/**
 * Whether a print may come back with its declarations grouped: a minified
 * stylesheet with `reorderDeclarations` left on.
 * @param {CssProcessOptions} options the process options
 * @returns {boolean} true where the grouped print may be offered
 */
const mayGroup = (options) =>
	/** @type {{ mode?: string }} */ (options).mode === "minify" &&
	(options.as === undefined || options.as === "stylesheet") &&
	options.groupDeclarations !== true &&
	(options.transforms === undefined ||
		options.transforms.reorderDeclarations !== false);

/**
 * The print a minified stylesheet is kept as: printed again with its
 * declarations grouped where that compresses smaller. The blocks no rule's own
 * body composed — the ones a lowering writes — are grouped after, so a second
 * minify finds nothing to regroup; each keeps its length, so the map holds.
 * @type {import("../util/SourceProcessor").PrintAgain<CssProcessOptions>}
 */
const printGrouped = (code, options) =>
	mayGroup(options) && groupingPays(code)
		? {
				options: { ...options, groupDeclarations: true },
				finish: (grouped) => parser()._regroupDeclarations(grouped)
			}
		: undefined;

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the CSS
 * `grammar`. All configuration is per `process` call. `process(src, { minimize:
 * true })` returns `{ code, map }` — the safely-minified serialization (built by
 * the same walk that fires visitors) and its source map; without `minimize` it
 * just walks and returns `undefined`. Babel-style usage:
 *
 * ```
 * new CssSourceProcessor().use({ [NodeType.AtRule]: (path) => {} }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.css.syntax.SourceProcessor`; unstable API
 * @extends {SourceProcessor<CssPath, Node, CssProcessOptions>}
 */
class CssSourceProcessor extends SourceProcessor {
	constructor() {
		// The printer is not named here but asked for on the first print, so a
		// walk that only fires visitors never loads it.
		super(parser().grammar, undefined, () => printer().printer, printGrouped);
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
	SourceProcessor: CssSourceProcessor
};
