/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const {
	approve,
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");

const AMDDefineDependency = require("./AMDDefineDependency");
const AMDDefineDependencyParserPlugin = require("./AMDDefineDependencyParserPlugin");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireDependenciesBlockParserPlugin = require("./AMDRequireDependenciesBlockParserPlugin");
const AMDRequireDependency = require("./AMDRequireDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const {
	AMDDefineRuntimeModule,
	AMDOptionsRuntimeModule
} = require("./AMDRuntimeModules");
const ConstDependency = require("./ConstDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const UnsupportedDependency = require("./UnsupportedDependency");

/** @typedef {import("../../declarations/WebpackOptions").ModuleOptions} ModuleOptions */
/** @typedef {import("../Compiler")} Compiler */

class AMDPlugin {
	/**
	 * @param {ModuleOptions} options the plugin options
	 * @param {Record<string, any>} amdOptions the AMD options
	 */
	constructor(options, amdOptions) {
		this.options = options;
		this.amdOptions = amdOptions;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		const amdOptions = this.amdOptions;
		compiler.hooks.compilation.tap(
			"AMDPlugin",
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
					.tap("AMDPlugin", (module, set) => {
						set.add(RuntimeGlobals.require);
					});

				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.amdOptions)
					.tap("AMDPlugin", (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.amdDefine)
					.tap("AMDPlugin", (chunk, set) => {
						compilation.addRuntimeModule(chunk, new AMDDefineRuntimeModule());
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.amdOptions)
					.tap("AMDPlugin", (chunk, set) => {
						compilation.addRuntimeModule(
							chunk,
							new AMDOptionsRuntimeModule(amdOptions)
						);
					});

				const handler = (parser, parserOptions) => {
					if (parserOptions.amd !== undefined && !parserOptions.amd) return;

					const tapOptionsHooks = (optionExpr, rootName, getMembers) => {
						parser.hooks.expression
							.for(optionExpr)
							.tap(
								"AMDPlugin",
								toConstantDependency(parser, RuntimeGlobals.amdOptions, [
									RuntimeGlobals.amdOptions
								])
							);
						parser.hooks.evaluateIdentifier
							.for(optionExpr)
							.tap(
								"AMDPlugin",
								evaluateToIdentifier(optionExpr, rootName, getMembers, true)
							);
						parser.hooks.evaluateTypeof
							.for(optionExpr)
							.tap("AMDPlugin", evaluateToString("object"));
						parser.hooks.typeof
							.for(optionExpr)
							.tap(
								"AMDPlugin",
								toConstantDependency(parser, JSON.stringify("object"))
							);
					};

					new AMDRequireDependenciesBlockParserPlugin(options).apply(parser);
					new AMDDefineDependencyParserPlugin(options).apply(parser);

					tapOptionsHooks("define.amd", "define", () => "amd");
					tapOptionsHooks("require.amd", "require", () => ["amd"]);
					tapOptionsHooks(
						"__webpack_amd_options__",
						"__webpack_amd_options__",
						() => []
					);

					parser.hooks.expression.for("define").tap("AMDPlugin", expr => {
						const dep = new ConstDependency(
							RuntimeGlobals.amdDefine,
							expr.range,
							[RuntimeGlobals.amdDefine]
						);
						dep.loc = expr.loc;
						parser.state.module.addPresentationalDependency(dep);
						return true;
					});
					parser.hooks.typeof
						.for("define")
						.tap(
							"AMDPlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("define")
						.tap("AMDPlugin", evaluateToString("function"));
					parser.hooks.canRename.for("define").tap("AMDPlugin", approve);
					parser.hooks.rename.for("define").tap("AMDPlugin", expr => {
						const dep = new ConstDependency(
							RuntimeGlobals.amdDefine,
							expr.range,
							[RuntimeGlobals.amdDefine]
						);
						dep.loc = expr.loc;
						parser.state.module.addPresentationalDependency(dep);
						return false;
					});
					parser.hooks.typeof
						.for("require")
						.tap(
							"AMDPlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("require")
						.tap("AMDPlugin", evaluateToString("function"));
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("AMDPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("AMDPlugin", handler);
			}
		);
	}
}

module.exports = AMDPlugin;
