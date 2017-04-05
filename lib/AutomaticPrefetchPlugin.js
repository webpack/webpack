/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const asyncLib = require("async");
const PrefetchDependency = require("./dependencies/PrefetchDependency");
const NormalModule = require("./NormalModule");

class AutomaticPrefetchPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
		});
		let lastModules = null;
		compiler.plugin("after-compile", (compilation, callback) => {
			lastModules = compilation.modules
				.filter(m => m instanceof NormalModule)
				.map(m => ({
					context: m.context,
					request: m.request
				}));
			callback();
		});
		compiler.plugin("make", (compilation, callback) => {
			if(!lastModules) return callback();
			asyncLib.forEach(lastModules, (m, callback) => {
				compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
			}, callback);
		});
	}
}
module.exports = AutomaticPrefetchPlugin;
