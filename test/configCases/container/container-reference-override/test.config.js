module.exports = {
	moduleScope(scope) {
		let ss;
		scope.ABC = {
			async get(module) {
				const testFactory = await ss.test[Object.keys(ss.test)[0]].get();
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
