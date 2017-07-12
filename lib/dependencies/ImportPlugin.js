/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportEagerContextDependency = require("./ImportEagerContextDependency");
const ImportLazyOnceContextDependency = require("./ImportLazyOnceContextDependency");
const ImportLazyContextDependency = require("./ImportLazyContextDependency");
const ImportParserPlugin = require("./ImportParserPlugin");

class ImportPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;
			const contextModuleFactory = params.contextModuleFactory;

			compilation.dependencyFactories.set(ImportDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(ImportDependency, new ImportDependency.Template());

			compilation.dependencyFactories.set(ImportEagerDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(ImportEagerDependency, new ImportEagerDependency.Template());

			compilation.dependencyFactories.set(ImportEagerContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(ImportEagerContextDependency, new ImportEagerContextDependency.Template());

			compilation.dependencyFactories.set(ImportLazyOnceContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(ImportLazyOnceContextDependency, new ImportLazyOnceContextDependency.Template());

			compilation.dependencyFactories.set(ImportLazyContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(ImportLazyContextDependency, new ImportLazyContextDependency.Template());

			normalModuleFactory.plugin("parser", (parser, parserOptions) => {

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
