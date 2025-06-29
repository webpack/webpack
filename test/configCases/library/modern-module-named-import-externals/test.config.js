module.exports = {
	findBundle() {
		return ["main.js"];
	},
	moduleScope(scope) {
		scope.externals0 = {
			default: "externals0-default",
			externals0: "externals0-named",
			prop1: "externals0-prop1",
			prop2: "externals0-prop2"
		};
		scope.externals1 = {
			default: "externals1-default",
			externals1: "externals1-named",
			a: "externals1-a",
			b: "externals1-b"
		};
		scope.externals2 = {
			default: "externals2-default",
			externals2: "externals2-named"
		};
		scope.externals3 = {
			default: "externals3-default",
			externals3: "externals3-named"
		};
	}
};
