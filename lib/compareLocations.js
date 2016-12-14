/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function compareLocations(a, b) {
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
			var aa = a.start ? a.start : a;
			var bb = b.start ? b.start : b;
			if(aa.line < bb.line) return -1;
			if(aa.line > bb.line) return 1;
			if(aa.column < bb.column) return -1;
			if(aa.column > bb.column) return 1;
			if(aa.index < bb.index) return -1;
			if(aa.index > bb.index) return 1;
			if(a.index < b.index) return -1;
			if(a.index > b.index) return 1;
			return 0;
		} else {
			return 0;
		}
	}
};
