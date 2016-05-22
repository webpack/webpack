/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var OriginalSource = require("webpack-sources").OriginalSource;
var RawSource = require("webpack-sources").RawSource;

function RawModule(source, identifier, readableIdentifier) {
	Module.call(this);
	this.sourceStr = source;
	this.identifierStr = identifier || this.sourceStr;
	this.readableIdentifierStr = readableIdentifier || this.identifierStr;
	this.cacheable = true;
	this.built = false;
}
module.exports = RawModule;

RawModule.prototype = Object.create(Module.prototype);
RawModule.prototype.constructor = RawModule;

RawModule.prototype.identifier = function() {
	return this.identifierStr;
};

RawModule.prototype.readableIdentifier = function(requestShortener) {
	return requestShortener.shorten(this.readableIdentifierStr);
};

RawModule.prototype.needRebuild = function() {
	return false;
};

RawModule.prototype.build = function(options, compilation, resolver, fs, callback) {
	this.builtTime = new Date().getTime();
	callback();
};

RawModule.prototype.source = function() {
	if(this.useSourceMap)
		return new OriginalSource(this.sourceStr, this.identifier());
	else
		return new RawSource(this.sourceStr);
};

RawModule.prototype.size = function() {
	return this.sourceStr.length;
};

RawModule.prototype.getSourceHash = function() {
	var hash = require("crypto").createHash("md5");
	hash.update(this.sourceStr);
	return hash.digest("hex");
};

RawModule.prototype.getAllModuleDependencies = function() {
	return [];
};

RawModule.prototype.createTemplate = function() {
	return new RawModule(this.sourceStr, "template of " + this.id);
};

RawModule.prototype.getTemplateArguments = function() {
	return [];
};
