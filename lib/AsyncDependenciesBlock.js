/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlock = require("./DependenciesBlock");

function AsyncDependenciesBlock(name) {
	DependenciesBlock.call(this);
	this.name = name;
	this.chunk = null;
}
module.exports = AsyncDependenciesBlock;

AsyncDependenciesBlock.prototype = Object.create(DependenciesBlock.prototype);

AsyncDependenciesBlock.prototype.updateHash = function updateHash(hash) {
	hash.update(this.name || "");
	DependenciesBlock.prototype.updateHash.call(this, hash);
};

AsyncDependenciesBlock.prototype.disconnect = function() {
	this.chunk = null;
	DependenciesBlock.prototype.disconnect.call(this);
};