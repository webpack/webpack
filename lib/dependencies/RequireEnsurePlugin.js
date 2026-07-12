/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} from "../ModuleTypeConstants.js";
import {
	evaluateToString,
	toConstantDependency
} from "../javascript/JavascriptParserHelpers.js";
import RequireEnsureDependenciesBlockParserPlugin from "./RequireEnsureDependenciesBlockParserPlugin.js";
import RequireEnsureDependency from "./RequireEnsureDependency.js";
import RequireEnsureItemDependency from "./RequireEnsureItemDependency.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */

const PLUGIN_NAME = "RequireEnsurePlugin";

class RequireEnsurePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RequireEnsureItemDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireEnsureItemDependency,
					new RequireEnsureItemDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireEnsureDependency,
					new RequireEnsureDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (
						parserOptions.requireEnsure !== undefined &&
						!parserOptions.requireEnsure
					) {
						return;
					}

					new RequireEnsureDependenciesBlockParserPlugin().apply(parser);
					parser.hooks.evaluateTypeof
						.for("require.ensure")
						.tap(PLUGIN_NAME, evaluateToString("function"));
					parser.hooks.typeof
						.for("require.ensure")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("function"))
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

export default RequireEnsurePlugin;

export { RequireEnsurePlugin as "module.exports" };
