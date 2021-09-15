module.exports = {
	moduleScope(scope) {
		scope.self.location = "https://test.cases/custom/deep/path/main.js";
	},
	findBundle() {
		return "./deep/path/main.js";
	}
};
