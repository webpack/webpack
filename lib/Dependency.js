/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Dependency() {
	this.module = null;
	this.Class = Dependency;
}
module.exports = Dependency;

Dependency.prototype.isEqualResource = function( /* other */ ) {
	return false;
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

Dependency.compareLocations = function(a, b) {
	if(typeof a === "string") {
		if(typeof b === "string") {
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		} else if(typeof b === "object") {
			return 1;
		} else {
			return 0;
		}
	} else if(typeof a === "object") {
		if(typeof b === "string") {
			return -1;
		} else if(typeof b === "object") {
			if(a.start) a = a.start;
			if(b.start) b = b.start;
			if(a.line < b.line) return -1;
			if(a.line > b.line) return 1;
			if(a.column < b.column) return -1;
			if(a.column > b.column) return 1;
			if(a.index < b.index) return -1;
			if(a.index > b.index) return 1;
			return 0;
		} else {
			return 0;
		}
	}
};
