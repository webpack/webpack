/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} from "./ModuleTypeConstants.js";
import ConstDependency from "./dependencies/ConstDependency.js";
/** @typedef {import("../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module.js").BuildInfo} BuildInfo */
/** @typedef {import("./javascript/JavascriptParser.js").default} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser.js").Range} Range */

const PLUGIN_NAME = "UseStrictPlugin";

class UseStrictPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions the javascript parser options
				 */
				const handler = (parser, parserOptions) => {
					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						const firstNode = ast.body[0];
						if (
							firstNode &&
							firstNode.type === "ExpressionStatement" &&
							firstNode.expression.type === "Literal" &&
							firstNode.expression.value === "use strict"
						) {
							// Remove "use strict" expression. It will be added later by the renderer again.
							// This is necessary in order to not break the strict mode when webpack prepends code.
							// @see https://github.com/webpack/webpack/issues/1970
							const dep = new ConstDependency(
								"",
								/** @type {Range} */ (firstNode.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (firstNode.loc);
							parser.state.module.addPresentationalDependency(dep);
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).strict = true;
						}
						if (parserOptions.overrideStrict) {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).strict =
								parserOptions.overrideStrict === "strict";
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

export default UseStrictPlugin;

export { UseStrictPlugin as "module.exports" };
