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
		delete global.webpackChunk;
		System.execute("(anonym)");
	}
};
