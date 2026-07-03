/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Babel-style visitor map keyed by a numeric node-type discriminator; a bucket
 * is a function (enter-only) or `{ enter?, exit? }`. `ctx.skipChildren()`
 * (enter only) stops the walker descending into the node's children.
 * @typedef {{ skipChildren(): void }} VisitorContext
 */
/**
 * A visitor receives the language's AST accessor as its first argument — the
 * object every node field is read through (e.g. `api.tagName(node)`), so a
 * consumer needs nothing beyond what the walk hands it. Today each language
 * passes its module-level accessor; the signature leaves room for a per-parse
 * accessor later without touching any visitor.
 * @template TNode
 * @template TApi
 * @typedef {(api: TApi, node: TNode, parent: TNode | null, ctx: VisitorContext) => void} VisitorFn
 */
/**
 * @template TNode
 * @template TApi
 * @typedef {VisitorFn<TNode, TApi> | { enter?: VisitorFn<TNode, TApi>, exit?: VisitorFn<TNode, TApi> }} VisitorBucket
 */
/**
 * @template TNode
 * @template TApi
 * @typedef {{ [nodeType: number]: VisitorBucket<TNode, TApi> }} VisitorMap
 */
/**
 * @template TNode
 * @template TApi
 * @typedef {{ enter: VisitorFn<TNode, TApi>[], exit: VisitorFn<TNode, TApi>[] }} CompiledVisitorBucket
 */
/**
 * @template TNode
 * @template TApi
 * @typedef {CompiledVisitorBucket<TNode, TApi>[]} CompiledVisitorMap a sparse array indexed by node type
 */
/**
 * A language grammar: parse `input` and fire the compiled visitors in source
 * order (the grammar owns tokenizing, parsing, and walking — and supplies the
 * accessor each visitor receives as its first argument).
 * @template TNode
 * @template TApi
 * @template TProcessOptions
 * @typedef {(input: string, visitors: CompiledVisitorMap<TNode, TApi>, options: TProcessOptions) => void} Grammar
 */

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar and node-type enum. Babel-style usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (api, node) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template TNode
 * @template TApi
 * @template [TProcessOptions=object]
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TNode, TApi, TProcessOptions>} grammar the grammar to drive over the source
	 * @param {TProcessOptions=} options default process options (e.g. `skip`) merged under each `process` call's own options
	 */
	constructor(grammar, options) {
		/** @type {Grammar<TNode, TApi, TProcessOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TNode, TApi>} */
		this._visitors = [];
		/** @type {TProcessOptions | undefined} */
		this._options = options;
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TNode, TApi>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TNode, TApi, TProcessOptions>} `this`, for chaining
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
	 * Run the grammar over `input`, firing visitors in source order. No
	 * AST retained. Per-call `options` override the instance defaults.
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options
	 */
	process(input, options) {
		const defaults = this._options;
		this._grammar(
			input,
			this._visitors,
			defaults
				? options
					? { ...defaults, ...options }
					: defaults
				: options || /** @type {TProcessOptions} */ ({})
		);
	}
}

module.exports = SourceProcessor;
