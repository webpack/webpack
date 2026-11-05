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
/** @import { BuildInfo } from "../module/Module" */
/** @import JavascriptParser, { Comment } from "../javascript/JavascriptParser" */
/** @import { JavascriptPath } from "../javascript/syntax" */
/** @import { PureAnnotationDetails } from "../errors/PureAnnotationsWarning" */

const getSyntaxParser = memoize(() => require("../javascript/syntax").parser);

const PLUGIN_NAME = "PureAnnotationsPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

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
 * Counts the annotations no node the parser reads them for follows, in one
 * pass over the program's ids keeping a node per gap between annotations.
 * @param {JavascriptPath} path the program's path
 * @param {number} program the program's node
 * @param {Comment[]} pure the annotations, in source order
 * @returns {number} how many do nothing
 */
const countWasted = (path, program, pure) => {
	const { NodeType } = getSyntaxParser();
	const ends = pure.map(
		(comment) => /** @type {[number, number]} */ (comment.range)[1]
	);
	// WHY: the node an annotation applies to starts first at or after its end;
	// each gap after an annotation keeps its earliest node, a later gap's
	// standing in for an empty one.
	const firstStart = ends.map(() => Infinity);
	const firstAnnotated = new Uint8Array(ends.length);

	// The program's subtree is the ids up to it, so a loop over them reads every
	// node in order of memory, not of the tree; type `0` is a dropped node.
	for (let node = path.subtreeStart(program); node <= program; node++) {
		const type = path.type(node);

		if (type === 0) continue;

		const start = path.start(node);

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

		// The only three the parser reads the annotation for; before anything
		// else it is just a comment. Kept in step with `JavascriptParser.isPure`.
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
					parser.hooks.program.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, program, comments) => {
							const pure = pureAnnotationsOf(comments);

							if (pure.length === 0) return;

							const wasted = countWasted(path, program, pure);

							if (wasted === 0) return;

							// Kept on the module rather than in a map here, so a module the
							// filesystem cache restores rather than parses still reports.
							const buildInfo = parser.state.module.buildInfo;

							getBuildDiagnostics(buildInfo).ineffectivePureAnnotations =
								wasted;
						}
					);
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
