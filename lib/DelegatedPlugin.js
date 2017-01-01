/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");

class DelegatedPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(DelegatedSourceDependency, params.normalModuleFactory);
		});

		compiler.plugin("compile", (params) => {
			params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin(this.options));
		});
	}
}

module.exports = DelegatedPlugin;
