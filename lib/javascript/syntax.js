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
/** @typedef {import("../util/SourceProcessor").SourceMap} SourceMap */
/** @typedef {JavascriptProcessOptions} TProcessOptions */
/**
 * @template S
 * @typedef {import("../util/SourceProcessor").RunState<S>} RunState
 */
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

	// Minifying with `compress.passes` above one minifies what it printed again,
	// as terser runs its passes, until they are done or one changes nothing.
	/**
	 * Parse `input` once and fire the visitors in source order. Asking for output
	 * — `mode`, the one thing that names it — makes the same walk print, given a
	 * printer supplied at construction: a
	 * {@link PrintContext} is created, each node's printer fires into it as the node
	 * finishes, and the result is returned as `{ code, map }`: the serialized output
	 * and, for a caller that named its input with `source` / `content`, the
	 * input->output source map — `map` is `undefined` without one. Asking for
	 * none of it only walks and returns `undefined`. A single parse — printing
	 * never re-parses; all configuration is per-call.
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] } & { source: string, content?: string }} options process options, naming the input so a map is built
	 * @returns {{ code: string, map: SourceMap }} the output and its map
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] }} options process options, asking for output but no map
	 * @returns {{ code: string, map: undefined }} the output alone
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {(TProcessOptions & RunState<TState>)=} options process options, asking for no output
	 * @returns {undefined} nothing — the walk alone
	 */
	/**
	 * @param {string} input source text
	 * @param {(TProcessOptions & RunState<TState>)=} options grammar-specific options (`skip`, …) plus `mode`, for the map `source` / `content`, and the visitors' `state`
	 * @returns {{ code: string, map: SourceMap | undefined } | undefined} `{ code, map }` when printing, else `undefined` — see the overloads
	 */
	process(input, options) {
		// Read as the widest overload; `map` is undefined where no source is named.
		const result = super.process(
			input,
			/** @type {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] } & { source: string, content?: string }} */ (
				options
			)
		);
		const later =
			result === undefined || options === undefined
				? undefined
				: require("./syntax-printer").laterPasses(options);
		if (result === undefined || later === undefined) return result;
		const { source } = /** @type {{ source?: string }} */ (options);
		let { code, map } = result;
		for (let i = 0; i < later.passes; i++) {
			const next =
				source === undefined
					? new JavascriptSourceProcessor().process(code, later.options)
					: new JavascriptSourceProcessor().process(code, {
							...later.options,
							source,
							content: code
						});
			if (next.code === code) break;
			if (map !== undefined && next.map !== undefined) {
				const { SourceMapSource } = require("webpack-sources");

				map = /** @type {SourceMap} */ (
					new SourceMapSource(
						next.code,
						source || "",
						next.map,
						code,
						map,
						true
					).map()
				);
			}
			code = next.code;
		}
		return { code, map };
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
