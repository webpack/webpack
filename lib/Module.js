/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlock = require("./DependenciesBlock");
var ModuleReason = require("./ModuleReason");

var debugId = 1000;
function Module() {
	DependenciesBlock.call(this);
	this.context = null;
	this.reasons = [];
	this.debugId = debugId++;
	this.lastId = -1;
	this.id = null;
	this.chunks = [];
	this.warnings = [];
	this.dependenciesWarnings = [];
	this.errors = [];
	this.dependenciesErrors = [];
}
module.exports = Module;

Module.prototype = Object.create(DependenciesBlock.prototype);

Module.prototype.disconnect = function() {
	this.reasons.length = 0;
	this.lastId = this.id;
	this.id = null;
	this.chunks.length = 0;
	DependenciesBlock.prototype.disconnect.call(this);
};

Module.prototype.addChunk = function(chunk) {
	var idx = this.chunks.indexOf(chunk);
	if(idx < 0)
		this.chunks.push(chunk);
};

Module.prototype.removeChunk = function(chunk) {
	var idx = this.chunks.indexOf(chunk);
	if(idx >= 0) {
		this.chunks.splice(idx, 1);
		chunk.removeModule(this);
	}
};

Module.prototype.addReason = function(module, dependency) {
	this.reasons.push(new ModuleReason(module, dependency));
};

Module.prototype.toString = function() {
	return "Module[" + (this.id || this.debugId) + "]";
};

Module.prototype.needRebuild = function(fileTimestamps, contextTimestamps) {
	return true;
};

Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
