/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportDependency = require("./ImportDependency");
const ImportContextDependency = require("./ImportContextDependency");
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

			compilation.dependencyFactories.set(ImportContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(ImportContextDependency, new ImportContextDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

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
