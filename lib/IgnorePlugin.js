"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class IgnorePlugin {
	constructor(resourceRegExp, contextRegExp) {
		this.resourceRegExp = resourceRegExp;
		this.contextRegExp = contextRegExp;
	}

	apply(compiler) {
		const resourceRegExp = this.resourceRegExp;
		const contextRegExp = this.contextRegExp;
		compiler.plugin("normal-module-factory", function(nmf) {
			nmf.plugin("before-resolve", function(result, callback) {
				if(!result) {
					return callback();
				}
				if(resourceRegExp.test(result.request) && (!contextRegExp || contextRegExp.test(result.context))) {
					return callback();
				}
				return callback(null, result);
			});
		});
		compiler.plugin("context-module-factory", function(cmf) {
			cmf.plugin("before-resolve", function(result, callback) {
				if(!result) {
					return callback();
				}
				if(resourceRegExp.test(result.request)) {
					return callback();
				}
				return callback(null, result);
			});
		});
	}
}
module.exports = IgnorePlugin;
