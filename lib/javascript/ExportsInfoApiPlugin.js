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
const ExportsInfoDependency = require("./ExportsInfoDependency");

/** @import Compiler from "../Compiler" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */

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
						.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) => {
							const range = path.range(expr);
							const dep =
								members.length >= 2
									? new ExportsInfoDependency(
											range,
											members.slice(0, -1),
											members[members.length - 1]
										)
									: new ExportsInfoDependency(range, null, members[0]);
							dep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
							parser.state.module.addDependency(dep);
							return true;
						});
					parser.hooks.expression
						.for("__webpack_exports_info__")
						.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
							const dep = new ConstDependency("true", path.range(expr));
							dep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
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

module.exports = ExportsInfoApiPlugin;
