/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleStrictModeWarning = require("./ModuleStrictModeWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

const PLUGIN_NAME = "WarnStrictModeModulesPlugin";

/**
 * This plugin warns when webpack automatically converts modules to strict mode.
 * When webpack processes ES modules (import/export), it automatically enables strict mode
 * which can break code that relies on non-strict mode features.
 */
class WarnStrictModeModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// Track modules that originally had "use strict" to avoid false warnings
				const modulesWithOriginalUseStrict = new WeakSet();
				/**
				 * Checks if a module is a JavaScript module that we should warn about
				 * @param {Module} module the module to check
				 * @returns {boolean} true if this is a JS module we should check
				 */
				const isJavaScriptModule = module =>
					Boolean(
						module.type &&
							(module.type === JAVASCRIPT_MODULE_TYPE_AUTO ||
								module.type === JAVASCRIPT_MODULE_TYPE_DYNAMIC ||
								module.type === JAVASCRIPT_MODULE_TYPE_ESM)
					);

				/**
				 * Parser handler to track modules with original "use strict"
				 * @param {JavascriptParser} parser the parser
				 */
				const handler = parser => {
					parser.hooks.program.tap(PLUGIN_NAME, ast => {
						const firstNode = ast.body[0];
						if (
							firstNode &&
							firstNode.type === "ExpressionStatement" &&
							firstNode.expression.type === "Literal" &&
							firstNode.expression.value === "use strict"
						) {
							// Module originally had "use strict" directive
							modulesWithOriginalUseStrict.add(parser.state.module);
						}
					});
				};

				// Register handlers for all JavaScript module types
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);

				// Generate warnings during seal phase
				// We check during seal to handle cached modules that weren't parsed in this compilation
				compilation.hooks.seal.tap(PLUGIN_NAME, () => {
					for (const module of compilation.modules) {
						if (
							module.buildInfo &&
							module.buildInfo.strict &&
							isJavaScriptModule(module) &&
							!modulesWithOriginalUseStrict.has(module) && // For cached modules, check source for "use strict" directive
							module.originalSource
						) {
							const originalSource = module.originalSource();
							if (originalSource) {
								const source = originalSource.source();
								if (typeof source === "string") {
									// Check for "use strict" at the beginning of the file or after initial comments
									// This regex matches "use strict" that appears as a directive, not in comments
									const hasUseStrictDirective =
										/^(?:\/\*[\s\S]*?\*\/\s*|\/\/.*\n\s*)*["']use strict["']/.test(
											source
										);

									if (!hasUseStrictDirective) {
										compilation.warnings.push(
											new ModuleStrictModeWarning(
												module,
												compilation.requestShortener
											)
										);
									}
								}
							}
						}
					}
				});
			}
		);
	}
}

module.exports = WarnStrictModeModulesPlugin;
