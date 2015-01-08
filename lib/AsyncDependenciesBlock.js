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

AsyncDependenciesBlock.prototype.updateHash = function updateHash(hash) {
	hash.update(this.chunkName || "");
	DependenciesBlock.prototype.updateHash.call(this, hash);
};

AsyncDependenciesBlock.prototype.disconnect = function() {
	this.chunks = null;
	DependenciesBlock.prototype.disconnect.call(this);
};
