/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");

/** @import { JavascriptParserOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { BuildInfo } from "../module/Module" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */

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
						for (const statement of ast.body) {
							const directive = parser.getDirective(statement);
							if (directive === undefined) break;
							if (directive !== "use strict") continue;
							// Remove "use strict" expression. It will be added later by the renderer again.
							// This is necessary in order to not break the strict mode when webpack prepends code.
							// @see https://github.com/webpack/webpack/issues/1970
							const dep = new ConstDependency(
								"",
								/** @type {Range} */ (statement.range)
							);
							dep.loc = parser.getLocation(statement);
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

module.exports = UseStrictPlugin;
