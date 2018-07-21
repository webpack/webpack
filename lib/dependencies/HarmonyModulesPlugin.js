/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const HarmonyCompatiblilityDependency = require("./HarmonyCompatibilityDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");

const NullFactory = require("../NullFactory");

const HarmonyDetectionParserPlugin = require("./HarmonyDetectionParserPlugin");
const HarmonyImportDependencyParserPlugin = require("./HarmonyImportDependencyParserPlugin");
const HarmonyExportDependencyParserPlugin = require("./HarmonyExportDependencyParserPlugin");

class HarmonyModulesPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(HarmonyImportDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(HarmonyImportDependency, new HarmonyImportDependency.Template());

			compilation.dependencyFactories.set(HarmonyImportSpecifierDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyImportSpecifierDependency, new HarmonyImportSpecifierDependency.Template());

			compilation.dependencyFactories.set(HarmonyCompatiblilityDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyCompatiblilityDependency, new HarmonyCompatiblilityDependency.Template());

			compilation.dependencyFactories.set(HarmonyExportHeaderDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyExportHeaderDependency, new HarmonyExportHeaderDependency.Template());

			compilation.dependencyFactories.set(HarmonyExportExpressionDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyExportExpressionDependency, new HarmonyExportExpressionDependency.Template());

			compilation.dependencyFactories.set(HarmonyExportSpecifierDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyExportSpecifierDependency, new HarmonyExportSpecifierDependency.Template());

			compilation.dependencyFactories.set(HarmonyExportImportedSpecifierDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyExportImportedSpecifierDependency, new HarmonyExportImportedSpecifierDependency.Template());

			compilation.dependencyFactories.set(HarmonyAcceptDependency, new NullFactory());
			compilation.dependencyTemplates.set(HarmonyAcceptDependency, new HarmonyAcceptDependency.Template());

			compilation.dependencyFactories.set(HarmonyAcceptImportDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(HarmonyAcceptImportDependency, new HarmonyAcceptImportDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.harmony !== "undefined" && !parserOptions.harmony)
					return;

				parser.apply(
					new HarmonyDetectionParserPlugin(),
					new HarmonyImportDependencyParserPlugin(this.options),
					new HarmonyExportDependencyParserPlugin()
				);
			});
		});
	}
}
module.exports = HarmonyModulesPlugin;
