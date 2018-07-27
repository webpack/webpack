/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const InitFragment = require("./InitFragment");
const {
	evaluateToIdentifier,
	evaluateToString,
	expressionIsUnsupported,
	getModulePath,
	toConstantDependency,
	toConstantDependencyWithWebpackRequire
} = require("./JavascriptParserHelpers");
const CachedConstDependency = require("./dependencies/CachedConstDependency");
const ModuleDependency = require("./dependencies/ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

class NodeStuffPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			"NodeStuffPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ModuleDecoratorDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ModuleDecoratorDependency,
					new ModuleDecoratorDependencyTemplate()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = Object.assign({}, localOptions, parserOptions.node);
					}

					const setModuleConstant = (expressionName, fn) => {
						parser.hooks.expression
							.for(expressionName)
							.tap("NodeStuffPlugin", expr => {
								const dep = new CachedConstDependency(
									JSON.stringify(fn(parser.state.module)),
									expr.range,
									expressionName
								);
								dep.loc = expr.loc;
								parser.state.current.addDependency(dep);
								return true;
							});
					};

					const setConstant = (expressionName, value) =>
						setModuleConstant(expressionName, () => value);

					const context = compiler.context;
					if (localOptions.__filename === "mock") {
						setConstant("__filename", "/index.js");
					} else if (localOptions.__filename) {
						setModuleConstant("__filename", module =>
							path.relative(context, module.resource)
						);
					}
					parser.hooks.evaluateIdentifier
						.for("__filename")
						.tap("NodeStuffPlugin", expr => {
							if (!parser.state.module) return;
							const resource = parser.state.module.resource;
							const i = resource.indexOf("?");
							return evaluateToString(i < 0 ? resource : resource.substr(0, i))(
								expr
							);
						});
					if (localOptions.__dirname === "mock") {
						setConstant("__dirname", "/");
					} else if (localOptions.__dirname) {
						setModuleConstant("__dirname", module =>
							path.relative(context, module.context)
						);
					}
					parser.hooks.evaluateIdentifier
						.for("__dirname")
						.tap("NodeStuffPlugin", expr => {
							if (!parser.state.module) return;
							return evaluateToString(parser.state.module.context)(expr);
						});
					parser.hooks.expression
						.for("require.main")
						.tap(
							"NodeStuffPlugin",
							toConstantDependencyWithWebpackRequire(
								parser,
								"__webpack_require__.c[__webpack_require__.s]"
							)
						);
					parser.hooks.expression
						.for("require.extensions")
						.tap(
							"NodeStuffPlugin",
							expressionIsUnsupported(
								parser,
								"require.extensions is not supported by webpack. Use a loader instead."
							)
						);
					parser.hooks.expression
						.for("require.main.require")
						.tap(
							"NodeStuffPlugin",
							expressionIsUnsupported(
								parser,
								"require.main.require is not supported by webpack."
							)
						);
					parser.hooks.expression
						.for("module.parent.require")
						.tap(
							"NodeStuffPlugin",
							expressionIsUnsupported(
								parser,
								"module.parent.require is not supported by webpack."
							)
						);
					parser.hooks.expression
						.for("module.loaded")
						.tap("NodeStuffPlugin", expr => {
							parser.state.module.buildMeta.moduleConcatenationBailout =
								"module.loaded";
							return toConstantDependency(parser, "module.l")(expr);
						});
					parser.hooks.expression
						.for("module.id")
						.tap("NodeStuffPlugin", expr => {
							parser.state.module.buildMeta.moduleConcatenationBailout =
								"module.id";
							return toConstantDependency(parser, "module.i")(expr);
						});
					parser.hooks.expression
						.for("module.exports")
						.tap("NodeStuffPlugin", () => {
							const module = parser.state.module;
							const isHarmony =
								module.buildMeta && module.buildMeta.exportsType;
							if (!isHarmony) return true;
						});
					parser.hooks.evaluateIdentifier
						.for("module.hot")
						.tap("NodeStuffPlugin", evaluateToIdentifier("module.hot", false));
					parser.hooks.expression.for("module").tap("NodeStuffPlugin", expr => {
						const isHarmony =
							parser.state.module.buildMeta &&
							parser.state.module.buildMeta.exportsType;
						const dep = new ModuleDecoratorDependency(
							getModulePath(
								parser.state.module.context,
								require.resolve(
									isHarmony
										? "../buildin/harmony-module.js"
										: "../buildin/module.js"
								)
							),
							parser.state.module,
							expr.range
						);
						dep.loc = expr.loc;
						parser.state.module.addDependency(dep);
						return true;
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("NodeStuffPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("NodeStuffPlugin", handler);
			}
		);
	}
}

class ModuleDecoratorDependency extends ModuleDependency {
	constructor(request, originalModule, range) {
		super(request);
		this.originalModule = originalModule;
		this.range = range;
	}
}

class ModuleDecoratorDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ModuleDecoratorDependency} */ (dependency);
		return [
			new InitFragment(
				`/* module decorator */ ${
					dep.originalModule.moduleArgument
				} = ${runtimeTemplate.moduleExports({
					module: dep.module,
					request: dep.request
				})}(${dep.originalModule.moduleArgument});\n`,
				-1,
				`module decorator ${dep.originalModule.id}`
			)
		];
	}
}

module.exports = NodeStuffPlugin;
