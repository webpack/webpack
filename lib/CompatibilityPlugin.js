/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

const nestedWebpackRequireTag = Symbol("nested __webpack_require__");
const PLUGIN_NAME = "CompatibilityPlugin";

class CompatibilityPlugin {
	/**
	 * Apply the plugin
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

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						if (
							parserOptions.browserify !== undefined &&
							!parserOptions.browserify
						)
							return;

						parser.hooks.call.for("require").tap(PLUGIN_NAME, expr => {
							// support for browserify style require delegator: "require(o, !0)"
							if (expr.arguments.length !== 2) return;
							const second = parser.evaluateExpression(expr.arguments[1]);
							if (!second.isBoolean()) return;
							if (second.asBool() !== true) return;
							const dep = new ConstDependency("require", expr.callee.range);
							dep.loc = expr.loc;
							if (parser.state.current.dependencies.length > 0) {
								const last =
									parser.state.current.dependencies[
										parser.state.current.dependencies.length - 1
									];
								if (
									last.critical &&
									last.options &&
									last.options.request === "." &&
									last.userRequest === "." &&
									last.options.recursive
								)
									parser.state.current.dependencies.pop();
							}
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					});

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = parser => {
					// Handle nested requires
					parser.hooks.preStatement.tap(PLUGIN_NAME, statement => {
						if (
							statement.type === "FunctionDeclaration" &&
							statement.id &&
							statement.id.name === "__webpack_require__"
						) {
							const newName = `__nested_webpack_require_${statement.range[0]}__`;
							parser.tagVariable(statement.id.name, nestedWebpackRequireTag, {
								name: newName,
								declaration: {
									updated: false,
									loc: statement.id.loc,
									range: statement.id.range
								}
							});
							return true;
						}
					});
					parser.hooks.pattern
						.for("__webpack_require__")
						.tap(PLUGIN_NAME, pattern => {
							const newName = `__nested_webpack_require_${pattern.range[0]}__`;
							parser.tagVariable(pattern.name, nestedWebpackRequireTag, {
								name: newName,
								declaration: {
									updated: false,
									loc: pattern.loc,
									range: pattern.range
								}
							});
							return true;
						});
					parser.hooks.expression
						.for(nestedWebpackRequireTag)
						.tap(PLUGIN_NAME, expr => {
							const { name, declaration } = parser.currentTagData;
							if (!declaration.updated) {
								const dep = new ConstDependency(name, declaration.range);
								dep.loc = declaration.loc;
								parser.state.module.addPresentationalDependency(dep);
								declaration.updated = true;
							}
							const dep = new ConstDependency(name, expr.range);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					// Handle hashbang
					parser.hooks.program.tap(PLUGIN_NAME, (program, comments) => {
						if (comments.length === 0) return;
						const c = comments[0];
						if (c.type === "Line" && c.range[0] === 0) {
							if (parser.state.source.slice(0, 2).toString() !== "#!") return;
							// this is a hashbang comment
							const dep = new ConstDependency("//", 0);
							dep.loc = c.loc;
							parser.state.module.addPresentationalDependency(dep);
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
module.exports = CompatibilityPlugin;
