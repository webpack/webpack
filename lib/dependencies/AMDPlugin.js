/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const AMDRequireDependency = require("./AMDRequireDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDDefineDependency = require("./AMDDefineDependency");
const UnsupportedDependency = require("./UnsupportedDependency");
const LocalModuleDependency = require("./LocalModuleDependency");

const NullFactory = require("../NullFactory");

const AMDRequireDependenciesBlockParserPlugin = require("./AMDRequireDependenciesBlockParserPlugin");
const AMDDefineDependencyParserPlugin = require("./AMDDefineDependencyParserPlugin");

const AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");

// const ParserHelpers = require("../ParserHelpers");
const parserHelpersLocation = require.resolve("../ParserHelpers");

class AMDPlugin {
	constructor(options, amdOptions) {
		this.amdOptions = amdOptions;
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		const amdOptions = this.amdOptions;
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;
			const contextModuleFactory = params.contextModuleFactory;

			compilation.dependencyFactories.set(AMDRequireDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDRequireDependency, new AMDRequireDependency.Template());

			compilation.dependencyFactories.set(AMDRequireItemDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(AMDRequireItemDependency, new AMDRequireItemDependency.Template());

			compilation.dependencyFactories.set(AMDRequireArrayDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDRequireArrayDependency, new AMDRequireArrayDependency.Template());

			compilation.dependencyFactories.set(AMDRequireContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(AMDRequireContextDependency, new AMDRequireContextDependency.Template());

			compilation.dependencyFactories.set(AMDDefineDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDDefineDependency, new AMDDefineDependency.Template());

			compilation.dependencyFactories.set(UnsupportedDependency, new NullFactory());
			compilation.dependencyTemplates.set(UnsupportedDependency, new UnsupportedDependency.Template());

			compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
			compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.amd !== "undefined" && !parserOptions.amd)
					return;

				function setExpressionToModule(outerExpr, module) {
					parser.plugin("expression " + outerExpr, (expr) => {
						const dep = new AMDRequireItemDependency(module, expr.range);
						dep.userRequest = outerExpr;
						dep.loc = expr.loc;
						parser.state.current.addDependency(dep);
						return true;
					});
				}

				parser.apply(
					new AMDRequireDependenciesBlockParserPlugin(options),
					new AMDDefineDependencyParserPlugin(options)
				);
				setExpressionToModule("require.amd", "!!webpack amd options");
				setExpressionToModule("define.amd", "!!webpack amd options");
				setExpressionToModule("define", "!!webpack amd define");
				parser.plugin("expression __webpack_amd_options__", {
					path: parserHelpersLocation,
					fnName: "AMDPluginAddVariable",
				}, { amdOptions });

				parser.plugin("evaluate typeof define.amd", {
					path: parserHelpersLocation,
					fnName: "evaluateToString",
				}, { value: typeof amdOptions });

				parser.plugin("evaluate typeof require.amd", {
					path: parserHelpersLocation,
					fnName: "evaluateToString",
				}, { value: typeof amdOptions });

				// parser.plugin("evaluate Identifier define.amd", ParserHelpers.evaluateToIdentifier("define.amd", true));
				parser.plugin("evaluate Identifier define.amd", {
					path: parserHelpersLocation,
					fnName: "evaluateToIdentifier",
				}, { identifier: "define.amd", truthy: true });

				// parser.plugin("evaluate Identifier require.amd", ParserHelpers.evaluateToIdentifier("require.amd", true));
				parser.plugin("evaluate Identifier require.amd", {
					path: parserHelpersLocation,
					fnName: "evaluateToIdentifier",
				}, { identifier: "require.amd", truthy: true });

				// parser.plugin("typeof define", ParserHelpers.toConstantDependency(JSON.stringify("function")));
				parser.plugin("typeof define", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, { code: JSON.stringify("function") });

				// parser.plugin("evaluate typeof define", ParserHelpers.evaluateToString("function"));
				parser.plugin("evaluate typeof define", {
					path: parserHelpersLocation,
					fnName: "evaluateToString",
				}, { value: "function" });

				parser.plugin("can-rename define", {
					path: parserHelpersLocation,
					fnName: "approve"
				});

				parser.plugin("rename define", {
					path: parserHelpersLocation,
					fnName: "AMDPluginRenameDefine",
				});

				parser.plugin("typeof require", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, { code: JSON.stringify("function") });

				parser.plugin("evaluate typeof require", {
					path: parserHelpersLocation,
					fnName: "evaluateToString"
				}, { value: "function" });
			});
		});
		compiler.plugin("after-resolvers", () => {
			compiler.resolvers.normal.apply(
				new AliasPlugin("described-resolve", {
					name: "amdefine",
					alias: path.join(__dirname, "..", "..", "buildin", "amd-define.js")
				}, "resolve"),
				new AliasPlugin("described-resolve", {
					name: "webpack amd options",
					alias: path.join(__dirname, "..", "..", "buildin", "amd-options.js")
				}, "resolve"),
				new AliasPlugin("described-resolve", {
					name: "webpack amd define",
					alias: path.join(__dirname, "..", "..", "buildin", "amd-define.js")
				}, "resolve")
			);
		});
	}
}
module.exports = AMDPlugin;
