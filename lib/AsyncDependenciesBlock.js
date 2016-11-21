/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlock = require("./DependenciesBlock");

function AsyncDependenciesBlock(name, module, loc) {
	DependenciesBlock.call(this);
	this.chunkName = name;
	this.chunks = null;
	this.module = module;
	this.loc = loc;

	Object.defineProperty(this, "chunk", {
		get: function() {
			throw new Error("`chunk` was been renamed to `chunks` and is now an array");
		},
		set: function() {
			throw new Error("`chunk` was been renamed to `chunks` and is now an array");
		}
	});

}
module.exports = AsyncDependenciesBlock;

AsyncDependenciesBlock.prototype = Object.create(DependenciesBlock.prototype);
AsyncDependenciesBlock.prototype.constructor = AsyncDependenciesBlock;

AsyncDependenciesBlock.prototype.updateHash = function updateHash(hash) {
	hash.update(this.chunkName || "");
	hash.update(this.chunks && this.chunks.map(function(chunk) {
		return typeof chunk.id === "number" ? chunk.id : "";
	}).join(",") || "");
	DependenciesBlock.prototype.updateHash.call(this, hash);
};

AsyncDependenciesBlock.prototype.disconnect = function() {
	this.chunks = null;
	DependenciesBlock.prototype.disconnect.call(this);
};

AsyncDependenciesBlock.prototype.unseal = function() {
	this.chunks = null;
	DependenciesBlock.prototype.unseal.call(this);
};

AsyncDependenciesBlock.prototype.sortItems = function() {
	DependenciesBlock.prototype.sortItems.call(this);
	if(this.chunks) {
		this.chunks.sort(function(a, b) {
			var i = 0;
			while(true) { // eslint-disable-line no-constant-condition
				if(!a.modules[i] && !b.modules[i]) return 0;
				if(!a.modules[i]) return -1;
				if(!b.modules[i]) return 1;
				if(a.modules[i].id > b.modules[i].id) return 1;
				if(a.modules[i].id < b.modules[i].id) return -1;
				i++;
			}
		});
	}
};
