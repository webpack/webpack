const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init({
			external1: "the external1 value",
			external2: "the external2 value"
		});
	},
	moduleScope(scope) {
		scope.System = System;
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
