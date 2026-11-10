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
/** @import JavascriptParser, { JavascriptNodeReader } from "../javascript/JavascriptParser" */
/** @import { TopLevelThisDetails } from "../errors/TopLevelThisWarning" */

const PLUGIN_NAME = "TopLevelThisPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

// loaded with the first module parsed, which loads the parser itself
const getSyntax = memoize(() => require("../javascript/syntax-parser"));

/**
 * Counts the reads of `this` that reach the top level of a program. Bodies
 * of functions rebind `this`, arrow functions keep it; a class rebinds it in
 * its body, but its heritage clause and computed keys are evaluated where
 * the class is written.
 * @param {JavascriptNodeReader} path the reader of the program's nodes
 * @param {number} program the program
 * @returns {number} how many there are
 */
const countTopLevelThis = (path, program) => {
	const { Field, Flag, NodeType } = getSyntax();
	let count = 0;
	/** @type {number[]} */
	const queue = [program];

	while (queue.length > 0) {
		const node = /** @type {number} */ (queue.pop());

		switch (path.type(node)) {
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
				break;
			case NodeType.ThisExpression:
				count++;
				break;
			case NodeType.ClassDeclaration:
			case NodeType.ClassExpression: {
				const superClass = path.field(0, Field.superClass, node);
				if (superClass !== 0) queue.push(superClass);
				const body = path.field(0, Field.body, node);
				const elements = path.fieldCount(Field.body, body);
				for (let i = 0; i < elements; i++) {
					const element = path.field(i, Field.body, body);
					if (path.flag(Flag.computed, element)) {
						queue.push(path.field(0, Field.key, element));
					}
				}
				break;
			}
			default:
				path.pushChildren(node, queue);
		}
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
					parser.hooks.program.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, ast) => {
							// Only ES modules: in CommonJS `this` is `module.exports`, which
							// is what the code reading it means.
							const buildMeta = parser.state.module.buildMeta;

							if (!buildMeta || buildMeta.exportsType !== "namespace") return;

							const count = countTopLevelThis(path, ast);

							if (count === 0) return;

							// Kept on the module rather than in a map here, so a module the
							// filesystem cache restores rather than parses still reports.
							const buildInfo = parser.state.module.buildInfo;

							getBuildDiagnostics(buildInfo).topLevelThis = count;
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
