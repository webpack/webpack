"use strict";

const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.System = System;
		scope.System.setRequire(scope.require);
	},
	afterExecute() {
		delete globalThis.webpackChunk;
		System.execute("(anonym)");
	}
};
