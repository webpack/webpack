/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const SourceProcessor = require("../util/SourceProcessor");

/** @typedef {import("./syntax-parser").JavascriptPath} JavascriptPath */
/** @typedef {import("./syntax-parser").JavascriptProcessOptions} JavascriptProcessOptions */
/** @typedef {import("../util/SourceProcessor").AnyParts} AnyParts */
/** @typedef {import("../util/SourceProcessor").PrintOptions} PrintOptions */
/**
 * @template T
 * @typedef {import("../util/SourceProcessor").VisitorMap<T>} VisitorMap
 */

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
			require("./syntax").parser.grammar,
			undefined,
			() => require("./syntax-printer").printer,
			require("./syntax").parser.A
		);
	}
}

module.exports = JavascriptSourceProcessor;
