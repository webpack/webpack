/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class IgnorePlugin {
	constructor(resourceRegExp, contextRegExp) {
		this.resourceRegExp = resourceRegExp;
		this.contextRegExp = contextRegExp;
	}

	apply(compiler) {
		const resourceRegExp = this.resourceRegExp;
		const contextRegExp = this.contextRegExp;
		compiler.plugin("normal-module-factory", (nmf) => {
			nmf.plugin("before-resolve", (result, callback) => {
				if(!result) return callback();
				if(resourceRegExp.test(result.request) &&
					(!contextRegExp || contextRegExp.test(result.context))) {
					return callback();
				}
				return callback(null, result);
			});
		});
		compiler.plugin("context-module-factory", (cmf) => {
			cmf.plugin("before-resolve", (result, callback) => {
				if(!result) return callback();
				if(resourceRegExp.test(result.request)) {
					return callback();
				}
				return callback(null, result);
			});
		});
	}
}

module.exports = IgnorePlugin;
