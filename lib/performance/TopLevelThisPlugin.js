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
const TopLevelThisWarning = require("../errors/TopLevelThisWarning");
const { compareStrings } = require("../util/comparators");
const getSourceModules = require("./getSourceModules");

/** @import { Program } from "estree" */
/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import { BuildInfo } from "../Module" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */
/** @import { TopLevelThisDetails } from "../errors/TopLevelThisWarning" */

const PLUGIN_NAME = "TopLevelThisPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

// Bodies that rebind `this`; everything else keeps the enclosing one, so an
// arrow function at the top level still reads the module's `this`.
const REBINDS_THIS = new Set(["FunctionDeclaration", "FunctionExpression"]);

// A class rebinds `this` in its body, but its heritage clause and computed
// keys are evaluated where the class is written.
const CLASS_TYPES = new Set(["ClassDeclaration", "ClassExpression"]);

/**
 * Counts the reads of `this` that reach the top level of a program.
 * @param {Program} ast the program
 * @returns {number} how many there are
 */
const countTopLevelThis = (ast) => {
	let count = 0;
	/** @type {unknown[]} */
	const queue = [ast];

	while (queue.length > 0) {
		const node = queue.pop();

		if (!node || typeof node !== "object") continue;

		if (Array.isArray(node)) {
			for (const item of /** @type {unknown[]} */ (node)) queue.push(item);
			continue;
		}

		// Walked structurally rather than per node type, so a node the estree
		// types do not name is still reached.
		const fields = /** @type {Record<string, unknown>} */ (node);
		const { type } = fields;

		if (typeof type !== "string") continue;
		if (REBINDS_THIS.has(type)) continue;

		if (type === "ThisExpression") {
			count++;
			continue;
		}

		if (CLASS_TYPES.has(type)) {
			queue.push(fields.superClass);

			const body = /** @type {EXPECTED_ANY} */ (fields.body);

			for (const element of (body && body.body) || []) {
				if (element.computed) queue.push(element.key);
			}

			continue;
		}

		for (const key of Object.keys(fields)) {
			if (key !== "range" && key !== "loc") queue.push(fields[key]);
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
					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						// Only ES modules: in CommonJS `this` is `module.exports`, which
						// is what the code reading it means.
						const buildMeta = parser.state.module.buildMeta;

						if (!buildMeta || buildMeta.exportsType !== "namespace") return;

						const count = countTopLevelThis(ast);

						if (count === 0) return;

						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo =
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo);

						buildInfo.topLevelThis = count;
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
						for (const module of getSourceModules(parent)) {
							if (seen.has(module)) continue;

							seen.add(module);

							const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
							const count = buildInfo.topLevelThis;

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
