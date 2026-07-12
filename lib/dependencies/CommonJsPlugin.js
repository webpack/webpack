/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import SelfModuleFactory from "../SelfModuleFactory.js";
import Template from "../Template.js";
import {
	evaluateToIdentifier,
	expressionIsUnsupported,
	toConstantDependency
} from "../javascript/JavascriptParserHelpers.js";
import CommonJsExportRequireDependency from "./CommonJsExportRequireDependency.js";
import CommonJsExportsDependency from "./CommonJsExportsDependency.js";
import CommonJsExportsParserPlugin from "./CommonJsExportsParserPlugin.js";
import CommonJsFullRequireDependency from "./CommonJsFullRequireDependency.js";
import CommonJsImportsParserPlugin from "./CommonJsImportsParserPlugin.js";
import CommonJsRequireContextDependency from "./CommonJsRequireContextDependency.js";
import CommonJsRequireDependency from "./CommonJsRequireDependency.js";
import CommonJsSelfReferenceDependency from "./CommonJsSelfReferenceDependency.js";
import ModuleDecoratorDependency from "./ModuleDecoratorDependency.js";
import RequireHeaderDependency from "./RequireHeaderDependency.js";
import RequireResolveContextDependency from "./RequireResolveContextDependency.js";
import RequireResolveDependency from "./RequireResolveDependency.js";
import RequireResolveHeaderDependency from "./RequireResolveHeaderDependency.js";
import RuntimeRequirementsDependency from "./RuntimeRequirementsDependency.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module.js").BuildInfo} BuildInfo */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */

const PLUGIN_NAME = "CommonJsPlugin";

class CommonJsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					CommonJsRequireDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsRequireDependency,
					new CommonJsRequireDependency.Template()
				);

				compilation.dependencyFactories.set(
					CommonJsFullRequireDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsFullRequireDependency,
					new CommonJsFullRequireDependency.Template()
				);

				compilation.dependencyFactories.set(
					CommonJsRequireContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsRequireContextDependency,
					new CommonJsRequireContextDependency.Template()
				);

				compilation.dependencyFactories.set(
					RequireResolveDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireResolveDependency,
					new RequireResolveDependency.Template()
				);

				compilation.dependencyFactories.set(
					RequireResolveContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireResolveContextDependency,
					new RequireResolveContextDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireResolveHeaderDependency,
					new RequireResolveHeaderDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireHeaderDependency,
					new RequireHeaderDependency.Template()
				);

				compilation.dependencyTemplates.set(
					CommonJsExportsDependency,
					new CommonJsExportsDependency.Template()
				);

				compilation.dependencyFactories.set(
					CommonJsExportRequireDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsExportRequireDependency,
					new CommonJsExportRequireDependency.Template()
				);

				const selfFactory = new SelfModuleFactory(compilation.moduleGraph);

				compilation.dependencyFactories.set(
					CommonJsSelfReferenceDependency,
					selfFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsSelfReferenceDependency,
					new CommonJsSelfReferenceDependency.Template()
				);

				compilation.dependencyFactories.set(
					ModuleDecoratorDependency,
					selfFactory
				);
				compilation.dependencyTemplates.set(
					ModuleDecoratorDependency,
					new ModuleDecoratorDependency.Template()
				);

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.harmonyModuleDecorator)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.nodeModuleDecorator)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.harmonyModuleDecorator)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(
							chunk,
							new HarmonyModuleDecoratorRuntimeModule()
						);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.nodeModuleDecorator)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(
							chunk,
							new NodeModuleDecoratorRuntimeModule()
						);
					});

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.commonjs !== undefined && !parserOptions.commonjs) {
						return;
					}
					parser.hooks.typeof
						.for("module")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);

					parser.hooks.expression
						.for("require.main")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(
								parser,
								`${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}]`,
								[RuntimeGlobals.moduleCache, RuntimeGlobals.entryModuleId]
							)
						);

					parser.hooks.expression
						.for("require.extensions")
						.tap(
							PLUGIN_NAME,
							expressionIsUnsupported(
								parser,
								"require.extensions is not supported by webpack. Use a loader instead."
							)
						);

					parser.hooks.expression
						.for(RuntimeGlobals.moduleLoaded)
						.tap(PLUGIN_NAME, (expr) => {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).moduleConcatenationBailout =
								RuntimeGlobals.moduleLoaded;
							const dep = new RuntimeRequirementsDependency([
								RuntimeGlobals.moduleLoaded
							]);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.expression
						.for(RuntimeGlobals.moduleId)
						.tap(PLUGIN_NAME, (expr) => {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).moduleConcatenationBailout =
								RuntimeGlobals.moduleId;
							const dep = new RuntimeRequirementsDependency([
								RuntimeGlobals.moduleId
							]);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.evaluateIdentifier.for("module.hot").tap(
						PLUGIN_NAME,
						evaluateToIdentifier("module.hot", "module", () => ["hot"], null)
					);

					new CommonJsImportsParserPlugin(parserOptions).apply(parser);
					new CommonJsExportsParserPlugin(compilation.moduleGraph).apply(
						parser
					);
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

class HarmonyModuleDecoratorRuntimeModule extends RuntimeModule {
	constructor() {
		super("harmony module decorator");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		return Template.asString([
			`${
				RuntimeGlobals.harmonyModuleDecorator
			} = ${runtimeTemplate.basicFunction("module", [
				"module = Object.create(module);",
				"if (!module.children) module.children = [];",
				"Object.defineProperty(module, 'exports', {",
				Template.indent([
					"enumerable: true,",
					`${runtimeTemplate.method("set", "", [
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
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		return Template.asString([
			`${RuntimeGlobals.nodeModuleDecorator} = ${runtimeTemplate.basicFunction(
				"module",
				[
					"module.paths = [];",
					"if (!module.children) module.children = [];",
					"return module;"
				]
			)};`
		]);
	}
}

export default CommonJsPlugin;

export { CommonJsPlugin as "module.exports" };
