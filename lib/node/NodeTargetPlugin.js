/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");
var Module = require("../Module");
var RawSource = require("webpack-core/lib/RawSource");



function NodeNativeDependency(request, range) {
	Dependency.call(this);
	this.Class = NodeNativeDependency;
	this.userRequest = request;
	this.request = request;
	this.range = range;
}

NodeNativeDependency.prototype = Object.create(Dependency.prototype);
NodeNativeDependency.prototype.type = "native module";

NodeNativeDependency.prototype.isEqualResource = function isEqualResource(other) {
	if(!(other instanceof NodeNativeDependency))
		return false;
	return this.request == other.request;
};

NodeNativeDependency.Template = require("../dependencies/ModuleDependencyTemplateAsRequireId");



function NodeNativeCommonJsDependency(request, range) {
	NodeNativeDependency.call(this, request, range);
	this.Class = NodeNativeCommonJsDependency;
}

NodeNativeCommonJsDependency.prototype = Object.create(NodeNativeDependency.prototype);
NodeNativeCommonJsDependency.Template = require("../dependencies/ModuleDependencyTemplateAsId");



function NodeNativeModule(request) {
	Module.call(this);
	this.request = request;
	this.built = false;
	this.cacheable = true;
}
NodeNativeModule.prototype = Object.create(Module.prototype);

NodeNativeModule.prototype.identifier = NodeNativeModule.prototype.readableIdentifier = function() {
	return this.request;
};

NodeNativeModule.prototype.build = function(options, compilation, resolver, fs, callback) {callback()};

NodeNativeModule.prototype.source = function() {
	return new RawSource("module.exports = require.parentRequire(" + JSON.stringify(this.request) + ");");
};

NodeNativeModule.prototype.needRebuild = function() {
	return false;
};

NodeNativeModule.prototype.size = function() {
	return 42 + this.request.length;
};



function NodeNativeModuleFactory() {
}
NodeNativeModuleFactory.prototype.create = function(context, dependency, callback) {
	return callback(null, new NodeNativeModule(dependency.request));
}




function NodeTargetPlugin() {
}
module.exports = NodeTargetPlugin;
NodeTargetPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(NodeNativeDependency, new NodeNativeModuleFactory());
		compilation.dependencyTemplates.set(NodeNativeDependency, new NodeNativeDependency.Template());

		compilation.dependencyFactories.set(NodeNativeCommonJsDependency, new NodeNativeModuleFactory());
		compilation.dependencyTemplates.set(NodeNativeCommonJsDependency, new NodeNativeCommonJsDependency.Template());
	});

	var natives = Object.keys(process.binding("natives"));
	compiler.parser.plugin("call require:commonjs:item", function(expr, param) {
		if(param.isString() && natives.indexOf(param.string) >= 0) {
			var dep = new NodeNativeCommonJsDependency(param.string, param.range);
			this.state.current.addDependency(dep);
			return true;
		}
	});
	compiler.parser.plugin("call define:amd:item", function(expr, param) {
		if(param.isString() && natives.indexOf(param.string) >= 0) {
			var dep = new NodeNativeDependency(param.string, param.range);
			this.state.current.addDependency(dep);
			return true;
		}
	});
	compiler.parser.plugin("call require:amd:item", function(expr, param) {
		if(param.isString() && natives.indexOf(param.string) >= 0) {
			var dep = new NodeNativeDependency(param.string, param.range);
			this.state.current.addDependency(dep);
			return true;
		}
	});
};