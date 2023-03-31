/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");
const {
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");

/** @typedef {import("./Compiler")} Compiler */

const PLUGIN_NAME = "RequireJsStuffPlugin";

module.exports = class RequireJsStuffPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				const handler = (parser, parserOptions) => {
					if (
						parserOptions.requireJs === undefined ||
						!parserOptions.requireJs
					) {
						return;
					}

					parser.hooks.call
						.for("require.config")
						.tap(PLUGIN_NAME, toConstantDependency(parser, "undefined"));
					parser.hooks.call
						.for("requirejs.config")
						.tap(PLUGIN_NAME, toConstantDependency(parser, "undefined"));

					parser.hooks.expression
						.for("require.version")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("0.0.0"))
						);
					parser.hooks.expression
						.for("requirejs.onError")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(
								parser,
								RuntimeGlobals.uncaughtErrorHandler,
								[RuntimeGlobals.uncaughtErrorHandler]
							)
						);
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
};
