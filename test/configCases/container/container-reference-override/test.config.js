module.exports = {
	moduleScope(scope) {
		let ss;
		scope.ABC = {
			async get(module) {
				const testFactory = await ss.test.get();
				const test = testFactory();
				return () => {
					return test(module);
				};
			},
			async init(shareScope) {
				ss = shareScope;
			}
		};
	}
};
