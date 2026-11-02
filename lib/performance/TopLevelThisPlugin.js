/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const TopLevelThisWarning = require("../errors/TopLevelThisWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { getBuildDiagnostics } = require("../util/buildDiagnostics");
const { compareStrings } = require("../util/comparators");
const memoize = require("../util/memoize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module, { BuildInfo } from "../module/Module" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */
/** @import { SyntaxTree } from "../javascript/syntax-parser" */
/** @import { TopLevelThisDetails } from "../errors/TopLevelThisWarning" */

const getSyntaxParser = memoize(() => require("../javascript/syntax-parser"));

const PLUGIN_NAME = "TopLevelThisPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

/**
 * Counts the reads of `this` that reach the top level of a program. A function
 * rebinds `this`; a class rebinds it in its body, but its heritage clause and
 * computed keys are evaluated where the class is written.
 * @param {SyntaxTree} tree the tree
 * @param {number} program the program's node
 * @returns {number} how many there are
 */
const countTopLevelThis = (tree, program) => {
	const { Field, Flag, NodeType } = getSyntaxParser();

	let count = 0;
	/** @type {number[]} */
	const stack = [program];

	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		const type = tree.type(node);

		if (
			type === NodeType.FunctionDeclaration ||
			type === NodeType.FunctionExpression
		) {
			continue;
		}

		if (type === NodeType.ThisExpression) {
			count++;
			continue;
		}

		if (
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			const superClass = tree.field(0, Field.superClass, node);

			if (superClass !== 0) stack.push(superClass);

			const body = tree.field(0, Field.body, node);
			const elements = tree.fieldCount(Field.body, body);

			for (let i = 0; i < elements; i++) {
				const element = tree.field(i, Field.body, body);

				if (tree.flag(Flag.computed, element)) {
					stack.push(tree.field(0, Field.key, element));
				}
			}

			continue;
		}

		tree.pushChildren(node, stack);
	}

	return count;
};

class TopLevelThisPlugin {
	/**
	 * Creates an instance of TopLevelThisPlugin.
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
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.programTree.tap(PLUGIN_NAME, (tree, program) => {
						// Only ES modules: in CommonJS `this` is `module.exports`, which
						// is what the code reading it means.
						const buildMeta = parser.state.module.buildMeta;

						if (!buildMeta || buildMeta.exportsType !== "namespace") return;

						const count = countTopLevelThis(tree, program);

						if (count === 0) return;

						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo = parser.state.module.buildInfo;

						getBuildDiagnostics(buildInfo).topLevelThis = count;
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
					/** @type {TopLevelThisDetails[]} */
					const modules = [];
					let total = 0;

					// A module can be reached both on its own and inside a
					// concatenation, so it is only counted the first time.
					/** @type {Set<Module>} */
					const seen = new Set();

					for (const parent of compilation.modules) {
						// Scope hoisting makes several modules into one, and the evidence
						// sits on the ones that were parsed.
						for (const module of parent.getSourceModules()) {
							if (seen.has(module)) continue;

							seen.add(module);

							const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
							const count =
								buildInfo.diagnostics && buildInfo.diagnostics.topLevelThis;

							if (!count) continue;

							total += count;
							modules.push({
								name: module.readableIdentifier(compilation.requestShortener),
								count
							});
						}
					}

					if (modules.length === 0) return;

					// Most first; ties break by name, module order is not stable.
					modules.sort(
						(a, b) => b.count - a.count || compareStrings(a.name, b.name)
					);

					const warning = new TopLevelThisWarning(
						modules.slice(0, MAX_REPORTED_MODULES),
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

module.exports = TopLevelThisPlugin;
