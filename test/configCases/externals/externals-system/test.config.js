const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init({
			external1: "the external1 value",
			external2: "the external2 value",
			external3: {
				default: "the external3 default export",
			}
		});
	},
	moduleScope(scope) {
		scope.System = System;
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
