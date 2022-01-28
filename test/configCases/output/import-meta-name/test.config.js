module.exports = {
	moduleScope(scope) {
		scope.pseudoImport = { meta: { url: "http://test.co/path/index.js" } };
	}
};
