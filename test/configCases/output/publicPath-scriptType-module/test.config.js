"use strict";

module.exports = {
	findBundle() {
		return ["./index.mjs"];
	},
	moduleScope(scope) {
		scope.pseudoImport = { meta: { url: "https://test.co/path/index.js" } };
	}
};
