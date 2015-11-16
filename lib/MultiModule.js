/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var RawSource = require("webpack-core/lib/RawSource");

function MultiModule(context, dependencies, name) {
	Module.call(this);
	this.context = context;
	this.dependencies = dependencies;
	this.name = name;
	this.built = false;
	this.cacheable = true;
}
module.exports = MultiModule;

MultiModule.prototype = Object.create(Module.prototype);

MultiModule.prototype.identifier = function() {
	return "multi " + this.name;
};

MultiModule.prototype.readableIdentifier = function() {
	return "multi " + this.name;
};

MultiModule.prototype.disconnect = function disconnect() {
	this.built = false;
	Module.prototype.disconnect.call(this);
};

MultiModule.prototype.build = function build(options, compilation, resolver, fs, callback) {
	this.built = true;
	return callback();
};

MultiModule.prototype.source = function(dependencyTemplates, outputOptions) {
	var str = [];
	this.dependencies.forEach(function(dep, idx) {
		if(dep.module) {
			if(idx === this.dependencies.length - 1)
				str.push("module.exports = ");
			str.push("__webpack_require__(");
			if(outputOptions.pathinfo)
				str.push("/*! " + dep.request + " */");
			str.push("" + JSON.stringify(dep.module.id));
			str.push(")");
		} else {
			str.push("(function webpackMissingModule() { throw new Error(");
			str.push(JSON.stringify("Cannot find module \"" + dep.request + "\""));
			str.push("); }())");
		}
		str.push(";\n");
	}, this);
	return new RawSource(str.join(""));
};

MultiModule.prototype.needRebuild = function needRebuild() {
	return false;
};

MultiModule.prototype.size = function() {
	return 16 + this.dependencies.length * 12;
};

MultiModule.prototype.updateHash = function(hash) {
	hash.update("multi module");
	hash.update(this.name || "");
	Module.prototype.updateHash.call(this, hash);
};
