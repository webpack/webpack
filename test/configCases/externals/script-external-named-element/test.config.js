"use strict";

module.exports = {
	moduleScope(scope) {
		// Defined for the bare identifiers but not as own properties of the global;
		// old `vm` contexts report a prototype property of the global as its own.
		scope.myGlobal = scope.document.createElement("div");
		scope.myForm = { lib: scope.document.createElement("input") };
	}
};
