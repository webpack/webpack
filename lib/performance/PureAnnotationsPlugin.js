/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const PureAnnotationsWarning = require("../errors/PureAnnotationsWarning");
const { compareStrings } = require("../util/comparators");
const { CompilerHintNotationRegExp } = require("../util/magicComment");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { BuildInfo } from "../Module" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */
/** @import { PureAnnotationDetails } from "../errors/PureAnnotationsWarning" */

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
 * @param {EXPECTED_ANY} ast the program
 * @returns {{ starts: number[], annotated: Set<number> }} the two of them
 */
const collectStarts = (ast) => {
	/** @type {number[]} */
	const starts = [];
	/** @type {Set<number>} */
	const annotated = new Set();
	/** @type {EXPECTED_ANY[]} */
	const queue = [ast];

	while (queue.length > 0) {
		const node = queue.pop();

		if (!node || typeof node !== "object") continue;

		if (Array.isArray(node)) {
			for (const item of node) queue.push(item);
			continue;
		}

		if (typeof node.type === "string" && Array.isArray(node.range)) {
			starts.push(node.range[0]);

			if (ANNOTATED_TYPES.has(node.type)) annotated.add(node.range[0]);
		}

		for (const key of Object.keys(node)) {
			if (key !== "range" && key !== "loc") queue.push(node[key]);
		}
	}

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
					parser.hooks.program.tap(PLUGIN_NAME, (ast, comments) => {
						const pure = comments.filter((comment) =>
							CompilerHintNotationRegExp.Pure.test(comment.value)
						);

						if (pure.length === 0) return;

						const { starts, annotated } = collectStarts(ast);
						let wasted = 0;

						for (const comment of pure) {
							const range = /** @type {[number, number]} */ (comment.range);
							const after = range[1];
							let nearest = Infinity;

							// Comments are outside every node's range, so the node the
							// annotation applies to is whichever starts first after it.
							for (const start of starts) {
								if (start >= after && start < nearest) nearest = start;
							}

							if (!annotated.has(nearest)) wasted++;
						}

						if (wasted === 0) return;

						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo =
							/** @type {NonNullable<typeof parser.state.module.buildInfo>} */
							(parser.state.module.buildInfo);

						buildInfo.ineffectivePureAnnotations = wasted;
					});
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

						if (!buildInfo.ineffectivePureAnnotations) continue;

						const count = buildInfo.ineffectivePureAnnotations;

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
