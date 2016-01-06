/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ContextElementDependency = require("./dependencies/ContextElementDependency");

function ContextReplacementPlugin(resourceRegExp, newContentResource, newContentRecursive, newContentRegExp) {
	this.resourceRegExp = resourceRegExp;
	if(typeof newContentResource === "function") {
		this.newContentCallback = newContentResource;
	} else if(typeof newContentResource === "string" && typeof newContentRecursive === "object") {
		this.newContentResource = newContentResource;
		this.newContentCreateContextMap = function(fs, callback) {
			callback(null, newContentRecursive)
		};
	} else if(typeof newContentResource === "string" && typeof newContentRecursive === "function") {
		this.newContentResource = newContentResource;
		this.newContentCreateContextMap = newContentRecursive;
	} else {
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
}
module.exports = ContextReplacementPlugin;
ContextReplacementPlugin.prototype.apply = function(compiler) {
	var resourceRegExp = this.resourceRegExp;
	var newContentCallback = this.newContentCallback;
	var newContentResource = this.newContentResource;
	var newContentRecursive = this.newContentRecursive;
	var newContentRegExp = this.newContentRegExp;
	var newContentCreateContextMap = this.newContentCreateContextMap;
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
				if(typeof newContentCallback === "function") {
					newContentCallback(result);
				}
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
				if(typeof newContentCreateContextMap === "function")
					result.resolveDependencies = createResolveDependenciesFromContextMap(newContentCreateContextMap);
				if(typeof newContentCallback === "function") {
					var origResource = result.resource;
					newContentCallback(result);
					if(result.resource !== origResource) {
						result.resource = path.resolve(origResource, result.resource);
					}
				}
			}
			return callback(null, result);
		});
	});
};

function createResolveDependenciesFromContextMap(createContextMap) {
	return function resolveDependenciesFromContextMap(fs, resource, recursive, regExp, callback) {
		createContextMap(fs, function(err, map) {
			if(err) return callback(err);
			var dependencies = Object.keys(map).map(function(key) {
				return new ContextElementDependency(map[key], key);
			});
			callback(null, dependencies);
		});
	}
};
