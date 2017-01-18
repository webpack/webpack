/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var OriginalSource = require("webpack-sources").OriginalSource;
var RawSource = require("webpack-sources").RawSource;
var WebpackMissingModule = require("./dependencies/WebpackMissingModule");
var DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");

function DelegatedModule(sourceRequest, data, type, userRequest) {
	Module.call(this);
	this.sourceRequest = sourceRequest;
	this.request = data.id;
	this.meta = data.meta;
	this.type = type;
	this.userRequest = userRequest;
	this.built = false;
	this.delegateData = data;
}
module.exports = DelegatedModule;

DelegatedModule.prototype = Object.create(Module.prototype);
DelegatedModule.prototype.constructor = DelegatedModule;

DelegatedModule.prototype.delegated = true;

DelegatedModule.prototype.identifier = function() {
	return "delegated " + JSON.stringify(this.request) + " from " + this.sourceRequest;
};

DelegatedModule.prototype.readableIdentifier = function() {
	return "delegated " + this.userRequest + " from " + this.sourceRequest;
};

DelegatedModule.prototype.needRebuild = function() {
	return false;
};

DelegatedModule.prototype.build = function(options, compilation, resolver, fs, callback) {
	this.built = true;
	this.builtTime = new Date().getTime();
	this.usedExports = true;
	this.providedExports = this.delegateData.exports || true;
	this.dependencies.length = 0;
	this.addDependency(new DelegatedSourceDependency(this.sourceRequest));
	callback();
};

DelegatedModule.prototype.unbuild = function() {
	this.built = false;
	Module.prototype.unbuild.call(this);
};

DelegatedModule.prototype.source = function() {
	var sourceModule = this.dependencies[0].module;
	var str;
	if(!sourceModule) {
		str = WebpackMissingModule.moduleCode(this.sourceRequest);
	} else {
		str = "module.exports = (__webpack_require__(" + sourceModule.id + "))";
		switch(this.type) {
			case "require":
				str += "(" + JSON.stringify(this.request) + ");";
				break;
			case "object":
				str += "[" + JSON.stringify(this.request) + "];";
				break;
		}
	}
	if(this.useSourceMap) {
		return new OriginalSource(str, this.identifier());
	} else {
		return new RawSource(str);
	}
};

DelegatedModule.prototype.size = function() {
	return 42;
};
