/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} from "./ModuleTypeConstants.js";
import { getInnerGraphUtils } from "./optimize/InnerGraph.js";
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Module.js").BuildInfo} BuildInfo */
/** @typedef {import("./javascript/JavascriptModule.js").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("./javascript/JavascriptParser.js").default} JavascriptParser */

const PLUGIN_NAME = "JavascriptMetaInfoPlugin";

class JavascriptMetaInfoPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const innerGraph = getInnerGraphUtils(compilation);
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.call.for("eval").tap(PLUGIN_NAME, () => {
						const buildInfo =
							/** @type {JavascriptModuleBuildInfo} */
							(parser.state.module.buildInfo);
						buildInfo.moduleConcatenationBailout = "eval()";
						const currentSymbol = innerGraph.getTopLevelSymbol(parser.state);
						if (currentSymbol) {
							innerGraph.addUsage(parser.state, null, currentSymbol);
						} else {
							innerGraph.bailout(parser.state);
						}
					});
					parser.hooks.finish.tap(PLUGIN_NAME, () => {
						const buildInfo =
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo);
						let topLevelDeclarations = buildInfo.topLevelDeclarations;
						if (topLevelDeclarations === undefined) {
							topLevelDeclarations = buildInfo.topLevelDeclarations = new Set();
						}
						for (const name of parser.scope.definitions.asSet()) {
							if (parser.isVariableDefined(name)) {
								topLevelDeclarations.add(name);
							}
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

export default JavascriptMetaInfoPlugin;

export { JavascriptMetaInfoPlugin as "module.exports" };
