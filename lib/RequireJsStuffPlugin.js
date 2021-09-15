/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");
const {
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");

/** @typedef {import("./Compiler")} Compiler */

module.exports = class RequireJsStuffPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"RequireJsStuffPlugin",
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
						.tap(
							"RequireJsStuffPlugin",
							toConstantDependency(parser, "undefined")
						);
					parser.hooks.call
						.for("requirejs.config")
						.tap(
							"RequireJsStuffPlugin",
							toConstantDependency(parser, "undefined")
						);

					parser.hooks.expression
						.for("require.version")
						.tap(
							"RequireJsStuffPlugin",
							toConstantDependency(parser, JSON.stringify("0.0.0"))
						);
					parser.hooks.expression
						.for("requirejs.onError")
						.tap(
							"RequireJsStuffPlugin",
							toConstantDependency(
								parser,
								RuntimeGlobals.uncaughtErrorHandler,
								[RuntimeGlobals.uncaughtErrorHandler]
							)
						);
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("RequireJsStuffPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("RequireJsStuffPlugin", handler);
			}
		);
	}
};
