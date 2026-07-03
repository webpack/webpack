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
 * A language grammar: parse `input` and fire the compiled visitors in source
 * order (the grammar owns tokenizing, parsing, walking — and the `path`
 * object each visitor receives).
 * @template TPath
 * @template TProcessOptions
 * @typedef {(input: string, visitors: CompiledVisitorMap<TPath>, options: TProcessOptions) => void} Grammar
 */

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar and node-type enum. Babel-style usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (path) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template TPath
 * @template [TProcessOptions=object]
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TPath, TProcessOptions>} grammar the grammar to drive over the source
	 * @param {TProcessOptions=} options default process options (e.g. `skip`) merged under each `process` call's own options
	 */
	constructor(grammar, options) {
		/** @type {Grammar<TPath, TProcessOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TPath>} */
		this._visitors = [];
		/** @type {TProcessOptions | undefined} */
		this._options = options;
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TPath>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TProcessOptions>} `this`, for chaining
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
