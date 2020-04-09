const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute: () => {
		System.init();
	},
	moduleScope(scope) {
		scope.System = System;
		System.register("ABC", [], $__export => {
			$__export({
				get(module) {
					return new Promise(resolve => {
						setTimeout(() => {
							resolve(() => "abc " + module);
						}, 100);
					});
				}
			});
		});
		System.register("DEF", [], $__export => {
			$__export({
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
		});
	},
	afterExecute: () => {
		System.execute("(anonym)");
	}
};
