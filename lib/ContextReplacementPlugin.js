/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function ContextReplacementPlugin(resourceRegExp, newContentResource, newContentRecursive, newContentRegExp) {
	this.resourceRegExp = resourceRegExp;
	if(typeof newContentResource !== "string") {
		newContentRegExp = newContentRecursive;
		newContentRecursive = newContentResource;
		newContentResource = undefined;
	}
	if(typeof newContentRecursive !== "boolean") {
		newContentRegExp = newContentRecursive;
		newContentRecursive = undefined;
	}
	this.newContentResource = newContentResource;
	this.newContentRecursive = newContentRecursive;
	this.newContentRegExp = newContentRegExp;
}
module.exports = ContextReplacementPlugin;
ContextReplacementPlugin.prototype.apply = function(compiler) {
	var resourceRegExp = this.resourceRegExp;
	var newContentResource = this.newContentResource;
	var newContentRecursive = this.newContentRecursive;
	var newContentRegExp = this.newContentRegExp;
	compiler.plugin("context-module-factory", function(cmf) {
		cmf.plugin("before-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.request)) {
				if(typeof newContentResource !== "undefined")
					result.request = newContentResource;
				if(typeof newContentRecursive !== "undefined")
					result.recursive = newContentRecursive;
				if(typeof newContentRegExp !== "undefined")
					result.regExp = newContentRegExp;
			}
			return callback(null, result);
		});
		cmf.plugin("after-resolve", function(result, callback) {
			if(!result) return callback();
			if(resourceRegExp.test(result.resource)) {
				if(typeof newContentResource !== "undefined")
					result.resource = path.resolve(result.resource, newContentResource);
				if(typeof newContentRecursive !== "undefined")
					result.recursive = newContentRecursive;
				if(typeof newContentRegExp !== "undefined")
					result.regExp = newContentRegExp;
			}
			return callback(null, result);
		});
	});
};