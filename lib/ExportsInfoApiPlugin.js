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
import ExportsInfoDependency from "./dependencies/ExportsInfoDependency.js";
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("./javascript/JavascriptParser.js").default} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser.js").Range} Range */

const PLUGIN_NAME = "ExportsInfoApiPlugin";

class ExportsInfoApiPlugin {
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
					ExportsInfoDependency,
					new ExportsInfoDependency.Template()
				);
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.expressionMemberChain
						.for("__webpack_exports_info__")
						.tap(PLUGIN_NAME, (expr, members) => {
							const dep =
								members.length >= 2
									? new ExportsInfoDependency(
											/** @type {Range} */ (expr.range),
											members.slice(0, -1),
											members[members.length - 1]
										)
									: new ExportsInfoDependency(
											/** @type {Range} */ (expr.range),
											null,
											members[0]
										);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addDependency(dep);
							return true;
						});
					parser.hooks.expression
						.for("__webpack_exports_info__")
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new ConstDependency(
								"true",
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
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

export default ExportsInfoApiPlugin;

export { ExportsInfoApiPlugin as "module.exports" };
