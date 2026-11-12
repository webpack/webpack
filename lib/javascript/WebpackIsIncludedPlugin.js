/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const IgnoreErrorModuleFactory = require("../errors/IgnoreErrorModuleFactory");
const {
	toConstantDependencyByPath
} = require("../javascript/JavascriptParserHelpers");
const { Field, NodeType } = require("../javascript/syntax").parser;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const WebpackIsIncludedDependency = require("./WebpackIsIncludedDependency");

/** @import Compiler from "../Compiler" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */

const PLUGIN_NAME = "WebpackIsIncludedPlugin";

class WebpackIsIncludedPlugin {
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
					WebpackIsIncludedDependency,
					new IgnoreErrorModuleFactory(normalModuleFactory)
				);
				compilation.dependencyTemplates.set(
					WebpackIsIncludedDependency,
					new WebpackIsIncludedDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.call
						.for("__webpack_is_included__")
						.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
							if (
								path.type(expr) !== NodeType.CallExpression ||
								path.fieldCount(Field.arguments, expr) !== 1
							) {
								return;
							}
							const argument = path.field(0, Field.arguments, expr);
							if (path.type(argument) === NodeType.SpreadElement) return;

							const request = parser.evaluateExpression(
								parser.nodeOfPath(path, argument)
							);

							if (!request.isString()) return;

							const dep = new WebpackIsIncludedDependency(
								/** @type {string} */ (request.string),
								path.range(expr)
							);
							dep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
							parser.state.module.addDependency(dep);
							return true;
						});
					parser.hooks.typeof
						.for("__webpack_is_included__")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							toConstantDependencyByPath(parser, JSON.stringify("function"))
						);
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

module.exports = WebpackIsIncludedPlugin;
