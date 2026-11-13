"use strict";

const vm = require("vm");

module.exports = {
	moduleScope(scope) {
		// Node 10 has no globalThis; use the realm executing the node bundle.
		scope.globalThis = vm.runInThisContext("this");
	}
};
