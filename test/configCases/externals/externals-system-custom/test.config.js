const System = require("../../../helpers/fakeSystem");

module.exports = {
	target: 'web',
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.window.windowExt = 'works';
		scope.rootExt = 'works';
		scope.varExt = 'works';
		scope.System = System;
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
