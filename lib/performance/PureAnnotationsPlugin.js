/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const PureAnnotationsWarning = require("../errors/PureAnnotationsWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { getBuildDiagnostics } = require("../util/buildDiagnostics");
const { compareStrings } = require("../util/comparators");
const { CompilerHintNotationRegExp } = require("../util/magicComment");
const memoize = require("../util/memoize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { Program } from "estree" */
/** @import { BuildInfo } from "../module/Module" */
/** @import JavascriptParser, { Comment } from "../javascript/JavascriptParser" */
/** @import { SyntaxTree } from "../javascript/syntax-parser" */
/** @import { PureAnnotationDetails } from "../errors/PureAnnotationsWarning" */

/** @typedef {{ [Key in string]?: AstValue }} AstFields */
/** @typedef {AstValue[]} AstArray */
/**
 * A value found while walking an estree AST structurally: a node, a field of
 * one, or a literal's value.
 * @typedef {string | number | boolean | bigint | RegExp | null | undefined | AstArray | AstFields} AstValue
 */

const getSyntaxParser = memoize(() => require("../javascript/syntax-parser"));

const PLUGIN_NAME = "PureAnnotationsPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

// The only three the parser reads the annotation for; before anything else it
// is just a comment. Kept in step with `JavascriptParser.isPure`.
const ANNOTATED_TYPES = new Set([
	"CallExpression",
	"NewExpression",
	"TaggedTemplateExpression"
]);

/**
 * Collects where every node starts, and which of those starts carry a node the
 * annotation is read for.
 * @param {Program} ast the program
 * @returns {{ starts: number[], annotated: Set<number> }} the two of them
 */
const collectStarts = (ast) => {
	/** @type {number[]} */
	const starts = [];
	/** @type {Set<number>} */
	const annotated = new Set();
	/** @type {AstValue[]} */
	const queue = [
		/** @type {AstValue} */ (/** @type {Program | AstValue} */ (ast))
	];

	while (queue.length > 0) {
		const node = queue.pop();

		if (!node || typeof node !== "object") continue;

		if (Array.isArray(node)) {
			for (const item of node) queue.push(item);
			continue;
		}

		// Walked structurally rather than per node type, so a node the estree
		// types do not name is still reached.
		const fields = /** @type {AstFields} */ (node);
		const { type, range } = fields;

		const start = Array.isArray(range) ? range[0] : undefined;

		if (typeof type === "string" && typeof start === "number") {
			starts.push(start);

			if (ANNOTATED_TYPES.has(type)) annotated.add(start);
		}

		for (const key of Object.keys(fields)) {
			if (key !== "range" && key !== "loc") queue.push(fields[key]);
		}
	}

	// Sorted so each annotation can binary-search for the node after it rather
	// than walking every start, which is quadratic on a generated file.
	starts.sort((a, b) => a - b);

	return { starts, annotated };
};

/**
 * The comments that are `#__PURE__` annotations, in source order.
 * @param {Comment[]} comments the program's comments
 * @returns {Comment[]} the annotations
 */
const pureAnnotationsOf = (comments) =>
	comments.filter((comment) =>
		CompilerHintNotationRegExp.Pure.test(comment.value)
	);

/**
 * Counts the annotations no node the parser reads them for follows.
 * @param {Comment[]} pure the annotations
 * @param {{ starts: number[], annotated: Set<number> }} collected where every node starts, from `collectStarts`
 * @returns {number} how many do nothing
 */
const countWasted = (pure, { starts, annotated }) => {
	let wasted = 0;

	for (const comment of pure) {
		const range = /** @type {[number, number]} */ (comment.range);
		const after = range[1];

		// Comments are outside every node's range, so the node the
		// annotation applies to is whichever starts first after it.
		let low = 0;
		let high = starts.length;

		while (low < high) {
			const middle = (low + high) >> 1;

			if (starts[middle] < after) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}

		if (low === starts.length || !annotated.has(starts[low])) {
			wasted++;
		}
	}

	return wasted;
};

/**
 * Counts the annotations no node the parser reads them for follows, off the
 * flat tree in one walk keeping a node per gap between annotations.
 * @param {SyntaxTree} tree the tree
 * @param {number} program the program's node
 * @param {Comment[]} pure the annotations, in source order
 * @returns {number} how many do nothing
 */
const countTreeWasted = (tree, program, pure) => {
	const { NodeType } = getSyntaxParser();
	const ends = pure.map(
		(comment) => /** @type {[number, number]} */ (comment.range)[1]
	);
	// WHY: the node an annotation applies to starts first at or after its end;
	// each gap after an annotation keeps its earliest node, a later gap's
	// standing in for an empty one.
	const firstStart = ends.map(() => Infinity);
	const firstAnnotated = new Uint8Array(ends.length);
	/** @type {number[]} */
	const stack = [program];

	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		const start = tree.start(node);

		tree.pushChildren(node, stack);

		if (start < ends[0]) continue;

		let low = 0;
		let high = ends.length - 1;

		while (low < high) {
			const middle = (low + high + 1) >> 1;

			if (ends[middle] <= start) {
				low = middle;
			} else {
				high = middle - 1;
			}
		}

		if (start > firstStart[low]) continue;

		const type = tree.type(node);
		const annotated =
			type === NodeType.CallExpression ||
			type === NodeType.NewExpression ||
			type === NodeType.TaggedTemplateExpression
				? 1
				: 0;

		if (start < firstStart[low]) {
			firstStart[low] = start;
			firstAnnotated[low] = annotated;
		} else if (annotated === 1) {
			firstAnnotated[low] = 1;
		}
	}

	let wasted = 0;
	let next = 0;

	for (let i = ends.length - 1; i >= 0; i--) {
		if (firstStart[i] !== Infinity) next = firstAnnotated[i];
		if (next === 0) wasted++;
	}

	return wasted;
};

class PureAnnotationsPlugin {
	/**
	 * Creates an instance of PureAnnotationsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		if (!hints) return;

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser the parser
				 */
				const handler = (parser) => {
					/**
					 * Records the module's annotations that do nothing.
					 * @param {number} wasted how many there are
					 * @returns {void}
					 */
					const record = (wasted) => {
						if (wasted === 0) return;

						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo = parser.state.module.buildInfo;

						getBuildDiagnostics(buildInfo).ineffectivePureAnnotations = wasted;
					};

					if (parser.options.walkIds) {
						parser.hooks.programTree.tap(
							PLUGIN_NAME,
							(tree, program, comments) => {
								const pure = pureAnnotationsOf(comments);

								if (pure.length === 0) return;

								record(countTreeWasted(tree, program, pure));
							}
						);
					} else {
						parser.hooks.program.tap(PLUGIN_NAME, (ast, comments) => {
							const pure = pureAnnotationsOf(comments);

							if (pure.length === 0) return;

							record(countWasted(pure, collectStarts(ast)));
						});
					}
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);

				// `afterSeal` is past the hash, which folds every message into it — a
				// hint reported earlier would change the build's identity.
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					const { requestShortener } = compilation;
					/** @type {PureAnnotationDetails[]} */
					const wasteful = [];
					let total = 0;

					for (const module of compilation.modules) {
						// Every built module carries one, so only the field is in question.
						const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);

						const count =
							buildInfo.diagnostics &&
							buildInfo.diagnostics.ineffectivePureAnnotations;

						if (!count) continue;

						total += count;
						wasteful.push({
							name: module.readableIdentifier(requestShortener),
							count
						});
					}

					if (wasteful.length === 0) return;

					// Ties break by name: module order is not stable across runs.
					wasteful.sort(
						(a, b) => b.count - a.count || compareStrings(a.name, b.name)
					);

					const warning = new PureAnnotationsWarning(
						wasteful.slice(0, MAX_REPORTED_MODULES),
						total
					);

					if (hints === "error") {
						compilation.errors.push(warning);
					} else if (hints === "stats") {
						compilation.hints.push(warning);
					} else {
						compilation.warnings.push(warning);
					}
				});
			}
		);
	}
}

module.exports = PureAnnotationsPlugin;
