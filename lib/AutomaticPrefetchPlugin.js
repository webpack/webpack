"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const async = require("async");
const PrefetchDependency = require("./dependencies/PrefetchDependency");
const NormalModule = require("./NormalModule");
class AutomaticPrefetchPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
		});
		let lastModules = null;
		compiler.plugin("after-compile", function(compilation, callback) {
			lastModules = compilation.modules
				.filter(m => m instanceof NormalModule)
				.map((m) => ({
					context: m.context,
					request: m.request
				}));
			callback();
		});
		compiler.plugin("make", function(compilation, callback) {
			if(!lastModules) {
				return callback();
			}
			async.each(lastModules, (m, callback) => {
				compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
			}, callback);
		});
	}
}
module.exports = AutomaticPrefetchPlugin;
