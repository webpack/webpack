/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ContextReplacementPlugin(resourceRegExp, newContentRegExp) {
	this.resourceRegExp = resourceRegExp;
	this.newContentRegExp = newContentRegExp
}
module.exports = ContextReplacementPlugin;
ContextReplacementPlugin.prototype.apply = function(compiler) {
	var resourceRegExp = this.resourceRegExp;
	var newContentRegExp = this.newContentRegExp;
	compiler.plugin("context-module-factory", function(cmf) {
		cmf.plugin("before-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.request)) {
				result.regExp = newContentRegExp;
			}
			return callback(null, result);
		});
		cmf.plugin("after-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.resource)) {
				result.regExp = newContentRegExp;
			}
			return callback(null, result);
		});
	});
};