/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Babel-style visitor map keyed by a numeric node-type discriminator; a bucket
 * is a function (enter-only) or `{ enter?, exit? }`.
 *
 * A visitor receives a single `path` argument (the Babel `path` shape): the
 * language's AST accessor with the current position on it — `path.node`,
 * `path.parent` (null at a root) — plus `path.skipChildren()` (enter only)
 * to stop the walk descending, and every field-read method (which defaults
 * to the current node). The path is one reused object rebound before each callback:
 * it is only valid during the callback, and future per-node functionality
 * lands on it without changing any visitor signature.
 * @template TPath
 * @typedef {(path: TPath) => void} VisitorFn
 */
/**
 * @template TPath
 * @typedef {VisitorFn<TPath> | { enter?: VisitorFn<TPath>, exit?: VisitorFn<TPath> }} VisitorBucket
 */
/**
 * @template TPath
 * @typedef {{ [nodeType: number]: VisitorBucket<TPath> }} VisitorMap
 */
/**
 * @template TPath
 * @typedef {{ enter: VisitorFn<TPath>[], exit: VisitorFn<TPath>[] }} CompiledVisitorBucket
 */
/**
 * @template TPath
 * @typedef {CompiledVisitorBucket<TPath>[]} CompiledVisitorMap a sparse array indexed by node type
 */
/**
 * The print options a {@link PrintContext} carries, read by the node printer via
 * `writer.options` (e.g. `writer.options.mode`). More entries slot in here as
 * print options grow.
 * @typedef {{ mode: "minify" | "beautify" }} PrintOptions
 */
/**
 * A version-3 source map. Written structurally (with the `3` literal) so it
 * satisfies both `webpack-sources` and the minimizer plugin's map types without
 * depending on either.
 * @typedef {{ version: 3, file: string, sources: string[], sourcesContent?: string[], names: string[], mappings: string }} SourceMap
 */
/**
 * The `process` source-map option: turns map collection on and names the input
 * (`sources[0]` / optional `sourcesContent[0]`). Present => `process` returns
 * `{ code, map }` instead of a bare string.
 * @typedef {{ source: string, content?: string }} SourceMapOptions
 */

/**
 * @param {SourceMapOptions} options the input's name / content
 * @param {string} mappings the VLQ `mappings` field
 * @returns {SourceMap} a version-3 source map
 */
const _makeMap = (options, mappings) => ({
	version: 3,
	file: options.source,
	sources: [options.source],
	sourcesContent: options.content === undefined ? undefined : [options.content],
	names: [],
	mappings
});

// Base64 VLQ, the source-map `mappings` encoding. Hand-rolled so producing a map
// pulls in no dependency (`source-map` is not a webpack dep).
const _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * @param {number} n a signed integer
 * @returns {string} its Base64 VLQ encoding
 */
const _vlq = (n) => {
	let v = n < 0 ? (-n << 1) | 1 : n << 1;
	let out = "";
	do {
		let digit = v & 31;
		v >>>= 5;
		if (v > 0) digit |= 32;
		out += _B64[digit];
	} while (v > 0);
	return out;
};
/**
 * A language node printer, fired for one node once all its visitors have run and
 * its children are printed. It takes the same `path` a visitor gets plus the
 * print context as its `writer`; it switches on `path.type()` and **returns** the
 * node's serialized text, reading its children's text from `writer.get` — knowing
 * nothing of the walk. Returning (rather than writing to a buffer) is what lets a
 * parent compose / transform its text from its finished children.
 * @template TPath
 * @template TNode
 * @typedef {(path: TPath, writer: PrintContext<TPath, TNode>) => string} NodePrinter
 */
/**
 * A language grammar: parse `input` once and fire the compiled visitors in
 * source order. When `writer` is given it is also printing — after each node's
 * visitors have run and its children are printed, the grammar fires the node
 * printer into `writer`; a single parse with no re-tokenizing.
 * @template TPath
 * @template TNode
 * @template TProcessOptions
 * @typedef {(input: string, visitors: CompiledVisitorMap<TPath>, writer: PrintContext<TPath, TNode> | undefined, options: TProcessOptions) => void} Grammar
 */

/**
 * The per-node output store handed to a language node printer as its `writer`. It
 * carries the print `options` (today just `mode`) and one map: a finished node ->
 * its printed text. A printer *returns* its text (`printNode` stores it) and reads
 * a child's with `get`, so a parent composes its own text from its children's —
 * the map is what makes that composition (and the CSS value transforms built on
 * it) possible. `take` flushes a finished top-level node into the output and drops
 * the map, so a streaming grammar never holds more than one top-level subtree.
 * @template TPath
 * @template TNode
 */
class PrintContext {
	/**
	 * @param {PrintOptions} options the print options
	 * @param {NodePrinter<TPath, TNode>} printer the node printer
	 * @param {boolean=} sourceMap collect an input->output source map as it prints
	 */
	constructor(options, printer, sourceMap) {
		/** @type {PrintOptions} */
		this.options = options;
		/** @type {NodePrinter<TPath, TNode>} */
		this._printer = printer;
		/** @type {Map<TNode, string>} printed text of each finished node */
		this._store = new Map();
		/** @type {string} accumulated output (flushed top-level nodes) */
		this._out = "";
		/** @type {boolean} whether a source map is being collected */
		this._srcMap = sourceMap === true;
		/** @type {number} 0-based line of the output's current end */
		this._genLine = 0;
		/** @type {number} 0-based column of the output's current end */
		this._genCol = 0;
		/** @type {number[][]} `[genLine, genCol, srcLine, srcCol]`, output-ordered */
		this._mappings = [];
	}

	/**
	 * Run the node printer for `node` and store what it returns (the grammar calls
	 * this once the node's visitors and children are done). `path` is on `node`.
	 * @param {TNode} node the finished node
	 * @param {TPath} path the language accessor, positioned on `node`
	 */
	printNode(node, path) {
		this._store.set(node, this._printer(path, this));
	}

	/**
	 * @param {TNode} node a child node whose printer already ran
	 * @returns {string} its printed text
	 */
	get(node) {
		return /** @type {string} */ (this._store.get(node));
	}

	/**
	 * Append one finished top-level node's text to the output and drop the
	 * per-node store so the next top-level node starts clean.
	 * @param {TNode} node the top-level node
	 */
	take(node) {
		const text = this.get(node);
		this._out += text;
		if (this._srcMap) {
			// Advance the generated position past this node's text (counting any
			// newlines) so the next `mark` lands at the right output column.
			let from = 0;
			let nl = text.indexOf("\n");
			let lines = 0;
			while (nl !== -1) {
				lines++;
				from = nl + 1;
				nl = text.indexOf("\n", from);
			}
			if (lines !== 0) {
				this._genLine += lines;
				this._genCol = text.length - from;
			} else {
				this._genCol += text.length;
			}
		}
		this._store.clear();
	}

	/**
	 * @returns {boolean} whether a source map is being collected (so a grammar
	 * only pays for looking up source positions when one is wanted)
	 */
	tracksSourceMap() {
		return this._srcMap;
	}

	/**
	 * Record that the output's current position maps to `[srcLine, srcCol]` (both
	 * 0-based) of the input. A grammar calls this right before {@link take}, so the
	 * mapping anchors the top-level node about to be appended.
	 * @param {number} srcLine 0-based source line
	 * @param {number} srcCol 0-based source column
	 */
	mark(srcLine, srcCol) {
		this._mappings.push([this._genLine, this._genCol, srcLine, srcCol]);
	}

	/**
	 * @param {SourceMapOptions} options the input's name / content
	 * @returns {SourceMap} the input->output source map
	 */
	sourceMap(options) {
		let out = "";
		let genLine = 0;
		let genCol = 0;
		let srcLine = 0;
		let srcCol = 0;
		let atLineStart = true;
		for (const [gl, gc, sl, sc] of this._mappings) {
			while (genLine < gl) {
				out += ";";
				genLine++;
				genCol = 0;
				atLineStart = true;
			}
			if (!atLineStart) out += ",";
			atLineStart = false;
			// Single source, so the source-index delta is always 0 (`_vlq(0)`).
			out +=
				_vlq(gc - genCol) + _vlq(0) + _vlq(sl - srcLine) + _vlq(sc - srcCol);
			genCol = gc;
			srcLine = sl;
			srcCol = sc;
		}
		return _makeMap(options, out);
	}

	/**
	 * @returns {string} the printed output
	 */
	result() {
		return this._out;
	}
}

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar, node-type enum and (optionally) node printer.
 * Babel-style usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (path) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template TPath
 * @template TNode
 * @template [TProcessOptions=object]
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TPath, TNode, TProcessOptions>} grammar the grammar to drive over the source
	 * @param {NodePrinter<TPath, TNode>=} printer the node printer, fired per node once its visitors and children are done; the same `path` a visitor gets plus the print context as its writer. Required to print (e.g. `minimize`); a future API can let a developer supply their own
	 */
	constructor(grammar, printer) {
		/** @type {Grammar<TPath, TNode, TProcessOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TPath>} */
		this._visitors = [];
		/** @type {NodePrinter<TPath, TNode> | undefined} */
		this._printer = printer;
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TPath>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions>} `this`, for chaining
	 */
	use(map) {
		// `map`'s keys are node-type enum members; `Object.keys` stringifies them,
		// so index the compiled array by the number to match the numeric `node.type`.
		for (const type of Object.keys(map)) {
			const key = Number(type);
			const v = map[key];
			let bucket = this._visitors[key];
			if (!bucket) {
				bucket = { enter: [], exit: [] };
				this._visitors[key] = bucket;
			}
			if (typeof v === "function") {
				bucket.enter.push(v);
			} else {
				if (v.enter) bucket.enter.push(v.enter);
				if (v.exit) bucket.exit.push(v.exit);
			}
		}
		return this;
	}

	/**
	 * Parse `input` once and fire the visitors in source order. When a print mode
	 * is requested (today `minimize`) and a printer was supplied, the same walk
	 * also prints — a {@link PrintContext} is created and, as each node finishes,
	 * the grammar fires the node printer into it — and the accumulated output is
	 * returned; otherwise the return is `""`. A single parse — printing never
	 * re-parses. All configuration is per-call.
	 *
	 * With a `sourceMap` option the same walk also collects an input->output source
	 * map (anchored per top-level node) and the return is `{ code, map }`.
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions & { sourceMap: SourceMapOptions }} options
	 * @returns {{ code: string, map: SourceMap }}
	 */
	/**
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions=} options
	 * @returns {string}
	 */
	/**
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options (`minimize`, …) plus the optional `sourceMap`
	 * @returns {EXPECTED_ANY} the printed source (with its map when `sourceMap` is set), else `""` — see the overloads for the caller-visible return
	 */
	process(input, options) {
		const opts = options || /** @type {TProcessOptions} */ ({});
		const sourceMap = /** @type {{ sourceMap?: SourceMapOptions }} */ (opts)
			.sourceMap;
		const minimize =
			/** @type {{ minimize?: boolean }} */ (opts).minimize === true;
		// A `sourceMap` implies minified output, so it prints too; `minimize` is the
		// other trigger. More print options slot in here without touching the grammar.
		const printing =
			this._printer !== undefined && (minimize || sourceMap !== undefined);
		const ctx = printing
			? new PrintContext(
					{ mode: "minify" },
					/** @type {NodePrinter<TPath, TNode>} */ (this._printer),
					sourceMap !== undefined
				)
			: undefined;
		this._grammar(input, this._visitors, ctx, opts);
		if (sourceMap === undefined) return ctx === undefined ? "" : ctx.result();
		return ctx === undefined
			? { code: "", map: _makeMap(sourceMap, "") }
			: { code: ctx.result(), map: ctx.sourceMap(sourceMap) };
	}
}

module.exports = SourceProcessor;
module.exports.PrintContext = PrintContext;
