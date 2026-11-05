"use strict";

module.exports = {
	moduleScope(scope) {
		// Named access: `<div id="myGlobal">` and `<form id="myForm">` resolve for
		// the bare identifiers but aren't own properties of the global. Old `vm`
		// contexts call a prototype property of the global its own, so use scope.
		scope.myGlobal = scope.document.createElement("div");
		scope.myForm = { lib: scope.document.createElement("input") };
	}
};
