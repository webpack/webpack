module.exports = {
	moduleScope(scope) {
		const o = {
			test: () => () => x => `wrong ${x}`
		};
		scope.ABC = {
			async get(module) {
				const testFactory = await o["test"]();
				const test = testFactory();
				return () => {
					return test(module);
				};
			},
			override(overrides) {
				Object.assign(o, overrides);
			}
		};
	}
};
