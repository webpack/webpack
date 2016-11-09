/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ReplaceSource = require("webpack-core/lib/ReplaceSource");
var RawSource = require("webpack-core/lib/RawSource");

function DependenciesBlockVariable(name, expression, dependencies) {
	this.name = name;
	this.expression = expression;
	this.dependencies = dependencies || [];
}
module.exports = DependenciesBlockVariable;

DependenciesBlockVariable.prototype.updateHash = function(hash) {
	hash.update(this.name);
	hash.update(this.expression);
	this.dependencies.forEach(function(d) {
		d.updateHash(hash);
	});
};

DependenciesBlockVariable.prototype.expressionSource = function(dependencyTemplates, outputOptions, requestShortener) {
	var source = new ReplaceSource(new RawSource(this.expression));
	this.dependencies.forEach(function(dep) {
		var template = dependencyTemplates.get(dep.constructor);
		if(!template) throw new Error("No template for dependency: " + dep.constructor.name);
		template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
	});
	return source;
};

DependenciesBlockVariable.prototype.disconnect = function() {
	this.dependencies.forEach(function(d) {
		d.disconnect();
	});
};

DependenciesBlockVariable.prototype.hasDependencies = function() {
	return this.dependencies.length > 0;
};
