const System = require("../../../helpers/fakeSystem");
module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.System = System;
	},
	afterExecute: () => {
		System.execute(`named-system-module-main`);
	}
};
