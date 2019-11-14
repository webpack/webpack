/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");
const Template = require("./Template");
const ModuleDecoratorDependency = require("./dependencies/ModuleDecoratorDependency");
const RuntimeRequirementsDependency = require("./dependencies/RuntimeRequirementsDependency");
const {
	evaluateToIdentifier,
	expressionIsUnsupported,
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");

class CommonJsStuffPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"CommonJsStuffPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ModuleDecoratorDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ModuleDecoratorDependency,
					new ModuleDecoratorDependency.Template()
				);

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.harmonyModuleDecorator)
					.tap("CommonJsStuffPlugin", (module, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.nodeModuleDecorator)
					.tap("CommonJsStuffPlugin", (module, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.harmonyModuleDecorator)
					.tap("CommonJsStuffPlugin", (chunk, set) => {
						compilation.addRuntimeModule(
							chunk,
							new HarmonyModuleDecoratorRuntimeModule()
						);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.nodeModuleDecorator)
					.tap("CommonJsStuffPlugin", (chunk, set) => {
						compilation.addRuntimeModule(
							chunk,
							new NodeModuleDecoratorRuntimeModule()
						);
					});

				const handler = (parser, parserOptions) => {
					parser.hooks.expression
						.for("require.main.require")
						.tap(
							"CommonJsStuffPlugin",
							expressionIsUnsupported(
								parser,
								"require.main.require is not supported by webpack."
							)
						);
					parser.hooks.expression
						.for("module.parent.require")
						.tap(
							"CommonJsStuffPlugin",
							expressionIsUnsupported(
								parser,
								"module.parent.require is not supported by webpack."
							)
						);
					parser.hooks.expression
						.for("require.main")
						.tap(
							"CommonJsStuffPlugin",
							toConstantDependency(
								parser,
								`${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}]`,
								[RuntimeGlobals.moduleCache, RuntimeGlobals.entryModuleId]
							)
						);
					parser.hooks.expression
						.for("module.loaded")
						.tap("CommonJsStuffPlugin", expr => {
							parser.state.module.buildMeta.moduleConcatenationBailout =
								"module.loaded";
							return toConstantDependency(
								parser,
								`${RuntimeGlobals.module}.l`,
								[RuntimeGlobals.module]
							)(expr);
						});
					parser.hooks.expression
						.for("module.id")
						.tap("CommonJsStuffPlugin", expr => {
							parser.state.module.buildMeta.moduleConcatenationBailout =
								"module.id";
							return toConstantDependency(
								parser,
								`${RuntimeGlobals.module}.i`,
								[RuntimeGlobals.module]
							)(expr);
						});
					parser.hooks.expression
						.for("module.exports")
						.tap("CommonJsStuffPlugin", expr => {
							const module = parser.state.module;
							const isHarmony =
								module.buildMeta && module.buildMeta.exportsType;
							if (!isHarmony) {
								if (module.moduleArgument === "module") {
									// avoid rewriting module.exports for backward-compat
									const dep = new RuntimeRequirementsDependency([
										RuntimeGlobals.module
									]);
									dep.loc = expr.loc;
									module.addPresentationalDependency(dep);
									return true;
								}
								return toConstantDependency(
									parser,
									`${module.moduleArgument}.exports`,
									[RuntimeGlobals.module]
								)(expr);
							}
						});
					parser.hooks.expression
						.for("this")
						.tap("CommonJsStuffPlugin", expr => {
							if (!parser.scope.topLevelScope) return;
							const module = parser.state.module;
							const isHarmony =
								module.buildMeta && module.buildMeta.exportsType;
							if (!isHarmony) {
								return toConstantDependency(parser, "this", [
									RuntimeGlobals.thisAsExports
								])(expr);
							}
						});
					parser.hooks.evaluateIdentifier
						.for("module.hot")
						.tap(
							"CommonJsStuffPlugin",
							evaluateToIdentifier("module.hot", "module", () => ["hot"], false)
						);
					parser.hooks.expression
						.for("module")
						.tap("CommonJsStuffPlugin", expr => {
							const isHarmony =
								parser.state.module.buildMeta &&
								parser.state.module.buildMeta.exportsType;
							const dep = new ModuleDecoratorDependency(
								isHarmony
									? RuntimeGlobals.harmonyModuleDecorator
									: RuntimeGlobals.nodeModuleDecorator
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CommonJsStuffPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("CommonJsStuffPlugin", handler);
			}
		);
	}
}

class HarmonyModuleDecoratorRuntimeModule extends RuntimeModule {
	constructor() {
		super("harmony module decorator");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeTemplate } = this.compilation;
		return Template.asString([
			`${
				RuntimeGlobals.harmonyModuleDecorator
			} = ${runtimeTemplate.basicFunction("module", [
				"module = Object.create(module);",
				"if (!module.children) module.children = [];",
				"Object.defineProperty(module, 'loaded', {",
				Template.indent([
					"enumerable: true,",
					`get: ${runtimeTemplate.returningFunction("module.l")}`
				]),
				"});",
				"Object.defineProperty(module, 'id', {",
				Template.indent([
					"enumerable: true,",
					`get: ${runtimeTemplate.returningFunction("module.i")}`
				]),
				"});",
				"Object.defineProperty(module, 'exports', {",
				Template.indent([
					"enumerable: true,",
					`set: ${runtimeTemplate.basicFunction("", [
						"throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);"
					])}`
				]),
				"});",
				"return module;"
			])};`
		]);
	}
}

class NodeModuleDecoratorRuntimeModule extends RuntimeModule {
	constructor() {
		super("node module decorator");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeTemplate } = this.compilation;
		return Template.asString([
			`${RuntimeGlobals.nodeModuleDecorator} = ${runtimeTemplate.basicFunction(
				"module",
				[
					"module.paths = [];",
					"if (!module.children) module.children = [];",
					"Object.defineProperty(module, 'loaded', {",
					Template.indent([
						"enumerable: true,",
						`get: ${runtimeTemplate.returningFunction("module.l")}`
					]),
					"});",
					"Object.defineProperty(module, 'id', {",
					Template.indent([
						"enumerable: true,",
						`get: ${runtimeTemplate.returningFunction("module.i")}`
					]),
					"});",
					"return module;"
				]
			)};`
		]);
	}
}

module.exports = CommonJsStuffPlugin;
