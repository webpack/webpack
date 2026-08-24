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
const NamespaceCallWarning = require("../errors/NamespaceCallWarning");
const { compareStrings } = require("../util/comparators");
const {
	collectModuleBindings,
	isSoleBinding
} = require("./collectModuleBindings");
const getSourceModules = require("./getSourceModules");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import { BuildInfo } from "../Module" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */
/** @import { NamespaceCallDetails } from "../errors/NamespaceCallWarning" */

const PLUGIN_NAME = "NamespaceCallPlugin";

// Enough to name the offenders without listing every module.
const MAX_REPORTED_MODULES = 5;

class NamespaceCallPlugin {
	/**
	 * Creates an instance of NamespaceCallPlugin.
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
						const bindings = collectModuleBindings(ast);
						const found = [...bindings.called]
							.filter(
								(name) =>
									isSoleBinding(bindings, name) && bindings.namespaces.has(name)
							)
							.sort(compareStrings);

						if (found.length === 0) return;

						// Kept on the module rather than in a map here, so a module the
						// filesystem cache restores rather than parses still reports.
						const buildInfo =
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo);

						buildInfo.namespaceCalls = found;
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
					/** @type {NamespaceCallDetails[]} */
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
							const found = buildInfo.namespaceCalls;

							if (!found) continue;

							total += found.length;
							modules.push({
								name: module.readableIdentifier(compilation.requestShortener),
								bindings: found
							});
						}
					}

					if (modules.length === 0) return;

					// Most first; ties break by name, module order is not stable.
					modules.sort(
						(a, b) =>
							b.bindings.length - a.bindings.length ||
							compareStrings(a.name, b.name)
					);

					const warning = new NamespaceCallWarning(
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

module.exports = NamespaceCallPlugin;
