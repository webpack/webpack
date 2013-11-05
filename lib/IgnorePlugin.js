/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function IgnorePlugin(resourceRegExp) {
	this.resourceRegExp = resourceRegExp;
}
module.exports = IgnorePlugin;
IgnorePlugin.prototype.apply = function(compiler) {
	var resourceRegExp = this.resourceRegExp;
	compiler.plugin("normal-module-factory", function(nmf) {
		nmf.plugin("before-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.request)) {
				return callback();
			}
			return callback(null, result);
		});
	});
	compiler.plugin("context-module-factory", function(cmf) {
		cmf.plugin("before-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.request)) {
				return callback();
			}
			return callback(null, result);
		});
	});
};