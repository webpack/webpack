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
 * print options grow. `environment` is what the target can read (the language's
 * slice of `output.environment`), keyed by feature name, so a printer never
 * reaches for a spelling the target would not understand.
 * `transforms` is what the author asked for beyond the safe default, keyed the
 * same way — a rewrite that is exact but observable stays off until named here.
 * @typedef {{ mode: "minify" | "beautify", environment?: Readonly<Record<string, boolean>>, transforms?: Readonly<Record<string, boolean>> }} PrintOptions
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
	 */
	constructor(options, printer) {
		/** @type {PrintOptions} */
		this.options = options;
		/** @type {NodePrinter<TPath, TNode>} */
		this._printer = printer;
		/** @type {Map<TNode, string>} printed text of each finished node */
		this._store = new Map();
		/** @type {string} accumulated output (flushed top-level nodes) */
		this._out = "";
		/** @type {number} 0-based line of the output's current end */
		this._genLine = 0;
		/** @type {number} 0-based column of the output's current end */
		this._genCol = 0;
		/** @type {number[][]} `[genLine, genCol, srcLine, srcCol]`, output-ordered */
		this._mappings = [];
		/** @type {[number, string][]} source-anchored literals to keep (comments), source-ordered */
		this._inserts = [];
		/** @type {number} next `_inserts` entry not yet flushed */
		this._insertIdx = 0;
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
	 * Append `text` to the output, advancing the tracked generated position past
	 * it (counting newlines) so the next mapping lands at the right output line/
	 * column.
	 * @param {string} text output text
	 */
	_emit(text) {
		this._out += text;
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

	/**
	 * Emit one finished top-level node: first any kept comments that precede it,
	 * then a source mapping anchoring its output start to `[srcLine, srcCol]`, then
	 * its text — and drop the per-node store so the next top-level node starts
	 * clean. `srcOffset` / `srcLine` / `srcCol` are the node's source position; a
	 * grammar that doesn't map positions (e.g. HTML) omits them (no comments, no
	 * mapping — the map ends up empty).
	 * @param {TNode} node the top-level node
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 */
	take(node, srcOffset, srcLine, srcCol) {
		if (srcOffset !== undefined && this._insertIdx < this._inserts.length) {
			this._flushBefore(srcOffset);
		}
		if (srcLine !== undefined) {
			this._mappings.push([
				this._genLine,
				this._genCol,
				srcLine,
				/** @type {number} */ (srcCol)
			]);
		}
		this._emit(this.get(node));
		this._store.clear();
	}

	/**
	 * Queue a literal to carry through to the output at source offset `pos` — a
	 * comment the printer chose to keep (e.g. a `/*!` license banner). Calls
	 * arrive in source order; each lands just before the first top-level node
	 * starting after `pos` (or at the end, via {@link result}).
	 * @param {number} pos source offset the literal sits before
	 * @param {string} text the literal text
	 */
	insert(pos, text) {
		this._inserts.push([pos, text]);
	}

	/**
	 * Emit every queued insert positioned before source offset `pos` (all of them
	 * for `Infinity`), in source order, so kept comments keep their place relative
	 * to the rules.
	 * @param {number} pos source offset to flush up to
	 */
	_flushBefore(pos) {
		const inserts = this._inserts;
		let i = this._insertIdx;
		while (i < inserts.length && inserts[i][0] < pos) {
			this._emit(inserts[i][1]);
			i++;
		}
		this._insertIdx = i;
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
		// Trailing kept comments (after the last top-level node) flush here.
		if (this._insertIdx < this._inserts.length) this._flushBefore(Infinity);
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
	 * Parse `input` once and fire the visitors in source order. With `minimize`
	 * (and a printer supplied at construction) the same walk also prints — a
	 * {@link PrintContext} is created, each node's printer fires into it as the node
	 * finishes, and the result is returned as `{ code, map }`: the serialized output
	 * and its input->output source map, always, independent of the pipeline's own
	 * source-map setting (`source` / `content` name the map's input). Without
	 * `minimize` it only walks and returns `undefined`. A single parse — printing
	 * never re-parses; all configuration is per-call.
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions & { minimize: true, source?: string, content?: string }} options
	 * @returns {{ code: string, map: SourceMap }}
	 */
	/**
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions=} options
	 * @returns {undefined}
	 */
	/**
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options (`skip`, …) plus `minimize` and, for the map, `source` / `content`
	 * @returns {EXPECTED_ANY} `{ code, map }` when printing, else `undefined` — see the overloads
	 */
	process(input, options) {
		const opts = options || /** @type {TProcessOptions} */ ({});
		const printing =
			this._printer !== undefined &&
			/** @type {{ minimize?: boolean }} */ (opts).minimize === true;
		if (!printing) {
			this._grammar(input, this._visitors, undefined, opts);
			return undefined;
		}
		const ctx = new PrintContext(
			{
				mode: "minify",
				environment:
					/** @type {{ environment?: Readonly<Record<string, boolean>> }} */ (
						opts
					).environment,
				transforms:
					/** @type {{ transforms?: Readonly<Record<string, boolean>> }} */ (
						opts
					).transforms
			},
			/** @type {NodePrinter<TPath, TNode>} */ (this._printer)
		);
		this._grammar(input, this._visitors, ctx, opts);
		const name = /** @type {{ source?: string, content?: string }} */ (opts);
		return {
			code: ctx.result(),
			map: ctx.sourceMap({ source: name.source || "", content: name.content })
		};
	}
}

module.exports = SourceProcessor;
module.exports.PrintContext = PrintContext;
