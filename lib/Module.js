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

Module.prototype._removeAndDo = require("./removeAndDo");

Module.prototype.removeChunk = function(chunk) {
	return this._removeAndDo("chunks", chunk, "removeModule");
};

Module.prototype.addReason = function(module, dependency) {
	this.reasons.push(new ModuleReason(module, dependency));
};

Module.prototype.removeReason = function(module, dependency) {
	for(var i = 0; i < this.reasons.length; i++) {
		var r = this.reasons[i];
		if(r.module === module && r.dependency === dependency) {
			this.reasons.splice(i, 1);
			return true;
		}
	}
	return false;
};

Module.prototype.hasReasonForChunk = function(chunk) {
	for(var i = 0; i < this.reasons.length; i++) {
		var r = this.reasons[i];
		if(r.chunks) {
			if(r.chunks.indexOf(chunk) >= 0)
				return true;
		} else if(r.module.chunks.indexOf(chunk) >= 0)
			return true;
	}
	return false;
};

function addToSet(set, items) {
	items.forEach(function(item) {
		if(set.indexOf(item) < 0)
			set.push(item);
	});
}

Module.prototype.rewriteChunkInReasons = function(oldChunk, newChunks) {
	this.reasons.forEach(function(r) {
		if(!r.chunks) {
			if(r.module.chunks.indexOf(oldChunk) < 0)
				return;
			r.chunks = r.module.chunks;
		}
		r.chunks = r.chunks.reduce(function(arr, c) {
			addToSet(arr, c !== oldChunk ? [c] : newChunks);
			return arr;
		}, []);
	});
};

Module.prototype.toString = function() {
	return "Module[" + (this.id || this.debugId) + "]";
};

Module.prototype.needRebuild = function(fileTimestamps, contextTimestamps) {
	return true;
};

Module.prototype.updateHash = function(hash) {
	hash.update(this.id + "");
	DependenciesBlock.prototype.updateHash.call(this, hash);
};

Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
