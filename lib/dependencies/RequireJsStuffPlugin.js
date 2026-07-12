/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import { toConstantDependency } from "../javascript/JavascriptParserHelpers.js";
import ConstDependency from "./ConstDependency.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../javascript/JavascriptParser.js").default} JavascriptParser */

const PLUGIN_NAME = "RequireJsStuffPlugin";

export default class RequireJsStuffPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
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
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
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
}

export { RequireJsStuffPlugin as "module.exports" };
