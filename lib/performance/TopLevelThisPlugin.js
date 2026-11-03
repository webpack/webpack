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
/** @import { JavascriptPath } from "../javascript/syntax-parser" */
/** @import { TopLevelThisDetails } from "../errors/TopLevelThisWarning" */

const getSyntaxParser = memoize(() => require("../javascript/syntax-parser"));

const PLUGIN_NAME = "TopLevelThisPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

/**
 * Counts the reads of `this` between two ids that reach the top level. A
 * function rebinds `this`; a class rebinds it in its body, but its heritage
 * clause and computed keys are evaluated where the class is written.
 * @param {JavascriptPath} path the program's path
 * @param {number} low the first id
 * @param {number} high the last id, the root of the subtree they hold
 * @returns {number} how many there are
 */
const countThisIn = (path, low, high) => {
	const { Field, Flag, NodeType } = getSyntaxParser();

	let count = 0;

	// A subtree is the ids from `subtreeStart` up to its root, so a reverse
	// scan meets each node before its children and skips one in a jump.
	for (let node = high; node >= low; node--) {
		const type = path.type(node);

		if (type === NodeType.ThisExpression) {
			count++;
		} else if (
			type === NodeType.FunctionDeclaration ||
			type === NodeType.FunctionExpression
		) {
			node = path.subtreeStart(node);
		} else if (
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			const superClass = path.field(0, Field.superClass, node);

			if (superClass !== 0) {
				count += countThisIn(path, path.subtreeStart(superClass), superClass);
			}

			const body = path.field(0, Field.body, node);
			const elements = path.fieldCount(Field.body, body);

			for (let i = 0; i < elements; i++) {
				const element = path.field(i, Field.body, body);

				if (path.flag(Flag.computed, element)) {
					const key = path.field(0, Field.key, element);

					count += countThisIn(path, path.subtreeStart(key), key);
				}
			}

			node = path.subtreeStart(node);
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
						(path, program) => {
							// Only ES modules: in CommonJS `this` is `module.exports`, which
							// is what the code reading it means.
							const buildMeta = parser.state.module.buildMeta;

							if (!buildMeta || buildMeta.exportsType !== "namespace") return;

							const count = countThisIn(
								path,
								path.subtreeStart(program),
								program
							);

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
