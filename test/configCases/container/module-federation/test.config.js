const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		System.setRequire(scope.require);
		scope.System = System;
		System.set("ABC", {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => "abc " + module);
					}, 100);
				});
			}
		});
		System.set("DEF", {
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
		});
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
