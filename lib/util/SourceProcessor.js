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
 * @template TNode
 * @typedef {(node: TNode, parent: TNode | null, ctx: VisitorContext) => void} VisitorFn
 */
/**
 * @template TNode
 * @typedef {VisitorFn<TNode> | { enter?: VisitorFn<TNode>, exit?: VisitorFn<TNode> }} VisitorBucket
 */
/**
 * @template TNode
 * @typedef {{ [nodeType: number]: VisitorBucket<TNode> }} VisitorMap
 */
/**
 * @template TNode
 * @typedef {{ enter: VisitorFn<TNode>[], exit: VisitorFn<TNode>[] }} CompiledVisitorBucket
 */
/**
 * @template TNode
 * @typedef {CompiledVisitorBucket<TNode>[]} CompiledVisitorMap a sparse array indexed by node type
 */
/**
 * A language grammar: parse `input` and fire the compiled visitors in source
 * order (the grammar owns tokenizing, parsing, and walking).
 * @template TNode
 * @template TProcessOptions
 * @typedef {(input: string, visitors: CompiledVisitorMap<TNode>, options: TProcessOptions) => void} Grammar
 */

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar and node-type enum. Babel-style usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (node) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template TNode
 * @template [TProcessOptions=object]
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TNode, TProcessOptions>} grammar the grammar to drive over the source
	 */
	constructor(grammar) {
		/** @type {Grammar<TNode, TProcessOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TNode>} */
		this._visitors = [];
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TNode>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TNode, TProcessOptions>} `this`, for chaining
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
	 * AST retained.
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options
	 */
	process(input, options) {
		this._grammar(
			input,
			this._visitors,
			options || /** @type {TProcessOptions} */ ({})
		);
	}
}

module.exports = SourceProcessor;
