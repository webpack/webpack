/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

const nestedWebpackRequireTag = Symbol("nested __webpack_require__");

class CompatibilityPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"CompatibilityPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CompatibilityPlugin", (parser, parserOptions) => {
						if (
							parserOptions.browserify !== undefined &&
							!parserOptions.browserify
						)
							return;

						parser.hooks.call
							.for("require")
							.tap("CompatibilityPlugin", expr => {
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
					parser.hooks.preStatement.tap("CompatibilityPlugin", statement => {
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
						.tap("CompatibilityPlugin", pattern => {
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
						.tap("CompatibilityPlugin", expr => {
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
					parser.hooks.program.tap(
						"CompatibilityPlugin",
						(program, comments) => {
							if (comments.length === 0) return;
							const c = comments[0];
							if (c.type === "Line" && c.range[0] === 0) {
								if (parser.state.source.slice(0, 2).toString() !== "#!") return;
								// this is a hashbang comment
								const dep = new ConstDependency("//", 0);
								dep.loc = c.loc;
								parser.state.module.addPresentationalDependency(dep);
							}
						}
					);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CompatibilityPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("CompatibilityPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("CompatibilityPlugin", handler);
			}
		);
	}
}
module.exports = CompatibilityPlugin;
