/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportWeakDependency = require("./ImportWeakDependency");
const ImportContextDependency = require("./ImportContextDependency");
const ImportParserPlugin = require("./ImportParserPlugin");

class ImportPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("ImportPlugin", (compilation, {
			contextModuleFactory,
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(ImportDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(ImportDependency, new ImportDependency.Template());

			compilation.dependencyFactories.set(ImportEagerDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(ImportEagerDependency, new ImportEagerDependency.Template());

			compilation.dependencyFactories.set(ImportWeakDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(ImportWeakDependency, new ImportWeakDependency.Template());

			compilation.dependencyFactories.set(ImportContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(ImportContextDependency, new ImportContextDependency.Template());

			normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], (parser, parserOptions) => {

				if(typeof parserOptions.import !== "undefined" && !parserOptions.import)
					return;

				parser.apply(
					new ImportParserPlugin(options)
				);
			});
		});
	}
}
module.exports = ImportPlugin;
