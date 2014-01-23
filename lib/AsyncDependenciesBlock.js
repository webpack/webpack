/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlock = require("./DependenciesBlock");

function AsyncDependenciesBlock(name, module, loc) {
	DependenciesBlock.call(this);
	this.chunkName = name;
	this.chunk = null;
	this.module = module;
	this.loc = loc;
}
module.exports = AsyncDependenciesBlock;

AsyncDependenciesBlock.prototype = Object.create(DependenciesBlock.prototype);

AsyncDependenciesBlock.prototype.updateHash = function updateHash(hash) {
	hash.update(this.chunkName || "");
	DependenciesBlock.prototype.updateHash.call(this, hash);
};

AsyncDependenciesBlock.prototype.disconnect = function() {
	this.chunk = null;
	DependenciesBlock.prototype.disconnect.call(this);
};