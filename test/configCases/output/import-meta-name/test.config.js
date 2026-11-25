"use strict";

module.exports = {
	moduleScope(scope) {
		// eslint-disable-next-line unicorn/prefer-https -- Match the fixture URL.
		scope.pseudoImport = { meta: { url: "http://test.co/path/index.js" } };
	}
};
