"use strict";

const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.System = System;
	},
	afterExecute: () => {
		System.execute("(anonym)");
	},
	findBundle() {
		return ["./main.system.js", "./main.umd.js"];
	}
};
