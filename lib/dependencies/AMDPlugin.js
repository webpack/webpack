/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import {
	approve,
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} from "../javascript/JavascriptParserHelpers.js";
import AMDDefineDependency from "./AMDDefineDependency.js";
import AMDDefineDependencyParserPlugin from "./AMDDefineDependencyParserPlugin.js";
import AMDRequireArrayDependency from "./AMDRequireArrayDependency.js";
import AMDRequireContextDependency from "./AMDRequireContextDependency.js";
import AMDRequireDependenciesBlockParserPlugin from "./AMDRequireDependenciesBlockParserPlugin.js";
import AMDRequireDependency from "./AMDRequireDependency.js";
import AMDRequireItemDependency from "./AMDRequireItemDependency.js";
import {
	AMDDefineRuntimeModule,
	AMDOptionsRuntimeModule
} from "./AMDRuntimeModules.js";
import ConstDependency from "./ConstDependency.js";
import LocalModuleDependency from "./LocalModuleDependency.js";
import UnsupportedDependency from "./UnsupportedDependency.js";
/** @typedef {import("../../declarations/WebpackOptions.js").Amd} Amd */
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../javascript/BasicEvaluatedExpression.js").GetMembers} GetMembers */

const PLUGIN_NAME = "AMDPlugin";

/** @typedef {Exclude<Amd, false>} AmdOptions */

class AMDPlugin {
	/**
	 * Creates an instance of AMDPlugin.
	 * @param {AmdOptions} amdOptions the AMD options
	 */
	constructor(amdOptions) {
		this.amdOptions = amdOptions;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { amdOptions } = this;
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					AMDRequireDependency,
					new AMDRequireDependency.Template()
				);

				compilation.dependencyFactories.set(
					AMDRequireItemDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					AMDRequireItemDependency,
					new AMDRequireItemDependency.Template()
				);

				compilation.dependencyTemplates.set(
					AMDRequireArrayDependency,
					new AMDRequireArrayDependency.Template()
				);

				compilation.dependencyFactories.set(
					AMDRequireContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					AMDRequireContextDependency,
					new AMDRequireContextDependency.Template()
				);

				compilation.dependencyTemplates.set(
					AMDDefineDependency,
					new AMDDefineDependency.Template()
				);

				compilation.dependencyTemplates.set(
					UnsupportedDependency,
					new UnsupportedDependency.Template()
				);

				compilation.dependencyTemplates.set(
					LocalModuleDependency,
					new LocalModuleDependency.Template()
				);

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.amdDefine)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.require);
					});

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.amdOptions)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.amdDefine)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(
							chunk,
							new AMDDefineRuntimeModule(),
							compilation.chunkGraph
						);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.amdOptions)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(
							chunk,
							new AMDOptionsRuntimeModule(amdOptions),
							compilation.chunkGraph
						);
					});

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.amd !== undefined && !parserOptions.amd) return;

					/**
					 * Processes the provided option expr.
					 * @param {string} optionExpr option expression
					 * @param {string} rootName root name
					 * @param {GetMembers} getMembers callback
					 */
					const tapOptionsHooks = (optionExpr, rootName, getMembers) => {
						parser.hooks.expression
							.for(optionExpr)
							.tap(
								PLUGIN_NAME,
								toConstantDependency(parser, RuntimeGlobals.amdOptions, [
									RuntimeGlobals.amdOptions
								])
							);
						parser.hooks.evaluateIdentifier
							.for(optionExpr)
							.tap(PLUGIN_NAME, (expr) =>
								evaluateToIdentifier(
									optionExpr,
									rootName,
									getMembers,
									true
								)(expr)
							);
						parser.hooks.evaluateTypeof
							.for(optionExpr)
							.tap(PLUGIN_NAME, evaluateToString("object"));
						parser.hooks.typeof
							.for(optionExpr)
							.tap(
								PLUGIN_NAME,
								toConstantDependency(parser, JSON.stringify("object"))
							);
					};

					new AMDRequireDependenciesBlockParserPlugin(parserOptions).apply(
						parser
					);
					new AMDDefineDependencyParserPlugin(parserOptions).apply(parser);

					tapOptionsHooks("define.amd", "define", () => ["amd"]);
					tapOptionsHooks("require.amd", "require", () => ["amd"]);
					tapOptionsHooks(
						"__webpack_amd_options__",
						"__webpack_amd_options__",
						() => []
					);

					parser.hooks.expression.for("define").tap(PLUGIN_NAME, (expr) => {
						const dep = new ConstDependency(
							RuntimeGlobals.amdDefine,
							/** @type {Range} */ (expr.range),
							[RuntimeGlobals.amdDefine]
						);
						dep.loc = /** @type {DependencyLocation} */ (expr.loc);
						parser.state.module.addPresentationalDependency(dep);
						return true;
					});
					parser.hooks.typeof
						.for("define")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("define")
						.tap(PLUGIN_NAME, evaluateToString("function"));
					parser.hooks.canRename.for("define").tap(PLUGIN_NAME, approve);
					parser.hooks.rename.for("define").tap(PLUGIN_NAME, (expr) => {
						const dep = new ConstDependency(
							RuntimeGlobals.amdDefine,
							/** @type {Range} */ (expr.range),
							[RuntimeGlobals.amdDefine]
						);
						dep.loc = /** @type {DependencyLocation} */ (expr.loc);
						parser.state.module.addPresentationalDependency(dep);
						return false;
					});
					parser.hooks.typeof
						.for("require")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("require")
						.tap(PLUGIN_NAME, evaluateToString("function"));
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

export default AMDPlugin;

export { AMDPlugin as "module.exports" };
