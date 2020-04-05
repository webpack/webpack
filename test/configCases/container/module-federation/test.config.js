const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.System = System;
		scope.ABC = {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => "abc " + module);
					}, 100);
				});
			}
		};
		scope.DEF = {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => ({
							__esModule: true,
							module,
							default: "def"
						}));
					}, 100);
				});
			}
		};
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
