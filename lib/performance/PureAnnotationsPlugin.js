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
/** @import JavascriptParser, { JavascriptNodeReader } from "../javascript/JavascriptParser" */
/** @import { PureAnnotationDetails } from "../errors/PureAnnotationsWarning" */

const PLUGIN_NAME = "PureAnnotationsPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

// loaded with the first module parsed, which loads the parser itself
const getSyntax = memoize(() => require("../javascript/syntax-parser"));

/**
 * Collects where every node starts, and which of those starts carry a node the
 * annotation is read for: a call, a `new` or a tagged template, as
 * `JavascriptParser.isPure` reads it.
 * @param {JavascriptNodeReader} path the reader of the program's nodes
 * @param {number} program the program
 * @returns {{ starts: number[], annotated: Set<number> }} the two of them
 */
const collectStarts = (path, program) => {
	const { NodeType } = getSyntax();
	/** @type {number[]} */
	const starts = [];
	/** @type {Set<number>} */
	const annotated = new Set();
	/** @type {number[]} */
	const queue = [program];

	while (queue.length > 0) {
		const node = /** @type {number} */ (queue.pop());
		const start = path.start(node);
		starts.push(start);
		switch (path.type(node)) {
			case NodeType.CallExpression:
			case NodeType.NewExpression:
			case NodeType.TaggedTemplateExpression:
				annotated.add(start);
		}
		path.pushChildren(node, queue);
	}

	// Sorted so each annotation can binary-search for the node after it rather
	// than walking every start, which is quadratic on a generated file.
	starts.sort((a, b) => a - b);

	return { starts, annotated };
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
						(path, ast, comments) => {
							const pure = comments.filter((comment) =>
								CompilerHintNotationRegExp.Pure.test(comment.value)
							);

							if (pure.length === 0) return;

							const { starts, annotated } = collectStarts(path, ast);
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
