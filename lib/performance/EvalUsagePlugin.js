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
const EvalUsageWarning = require("../errors/EvalUsageWarning");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { BuildInfo } from "../Module" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */

const PLUGIN_NAME = "EvalUsagePlugin";

// Enough to name the offenders without listing the graph.
const MAX_REPORTED_MODULES = 5;

class EvalUsagePlugin {
	/**
	 * Creates an instance of EvalUsagePlugin.
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
					// Only a call of the name itself is a direct eval; `(0, eval)()` and
					// `globalThis.eval()` run in global scope and reach no local name.
					parser.hooks.call.for("eval").tap(PLUGIN_NAME, () => {
						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo = /** @type {BuildInfo} */ (
							parser.state.module.buildInfo
						);

						buildInfo.usesEval = true;
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
					/** @type {string[]} */
					const callers = [];

					for (const module of compilation.modules) {
						// Every built module carries one, so only the field is in question.
						const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);

						if (!buildInfo.usesEval) continue;

						callers.push(module.readableIdentifier(requestShortener));
					}

					if (callers.length === 0) return;

					// Sorted by name: module order is not stable across runs.
					callers.sort(compareStrings);

					const warning = new EvalUsageWarning(
						callers.slice(0, MAX_REPORTED_MODULES),
						callers.length
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

module.exports = EvalUsagePlugin;
