/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} from "../ModuleTypeConstants.js";
import URLParserPlugin from "../url/URLParserPlugin.js";
import URLContextDependency from "./URLContextDependency.js";
import URLDependency from "./URLDependency.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../javascript/JavascriptParser.js").default} JavascriptParser */

const PLUGIN_NAME = "URLPlugin";

class URLPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory, contextModuleFactory }) => {
				compilation.dependencyFactories.set(URLDependency, normalModuleFactory);
				compilation.dependencyTemplates.set(
					URLDependency,
					new URLDependency.Template()
				);
				compilation.dependencyFactories.set(
					URLContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					URLContextDependency,
					new URLContextDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.url === false) return;
					new URLParserPlugin(parserOptions).apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

export default URLPlugin;

export { URLPlugin as "module.exports" };
