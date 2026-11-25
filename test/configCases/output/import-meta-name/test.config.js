"use strict";

module.exports = {
	moduleScope(scope) {
		scope.pseudoImport = { meta: { url: "https://test.co/path/index.js" } };
	}
};
