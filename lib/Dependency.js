/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Dependency() {
	this.module = null;
	this.Class = Dependency;
}
module.exports = Dependency;

Dependency.prototype.isEqualResource = function(other) {
	return false;
};

Dependency.prototype.updateHash = function(hash) {
	hash.update((this.module && this.module.id) + "");
};

Dependency.prototype.disconnect = function() {
	this.module = null;
};