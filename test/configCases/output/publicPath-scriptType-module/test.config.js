module.exports = {
	findBundle() {
		return ["./index.mjs"];
	},
	moduleScope(scope) {
		scope.pseudoImport = { meta: { url: "http://test.co/path/index.js" } };
	}
};
