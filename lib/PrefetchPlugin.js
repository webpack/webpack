/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const PrefetchDependency = require("./dependencies/PrefetchDependency");

class PrefetchPlugin {

	constructor(context, request) {
		if(!request) {
			this.request = context;
		} else {
			this.context = context;
			this.request = request;
		}
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
		});
		compiler.plugin("make", (compilation, callback) => {
			compilation.prefetch(this.context || compiler.context, new PrefetchDependency(this.request), callback);
		});
	}

}
module.exports = PrefetchPlugin;
