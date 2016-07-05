/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Dependency() {
	this.module = null;
}
module.exports = Dependency;

Dependency.prototype.isEqualResource = function( /* other */ ) {
	return false;
};

// Returns the referenced module and export
Dependency.prototype.getReference = function() {
	if(!this.module) return null;
	return {
		module: this.module,
		importedNames: true, // true: full object, false: only sideeffects/no export, array of strings: the exports with this names
	}
};

Dependency.prototype.getWarnings = function() {
	return null;
};

Dependency.prototype.updateHash = function(hash) {
	hash.update((this.module && this.module.id) + "");
};

Dependency.prototype.disconnect = function() {
	this.module = null;
};

Dependency.compare = function(a, b) {
	return Dependency.compareLocations(a.loc, b.loc);
};

Dependency.compareLocations = require("./compareLocations");
