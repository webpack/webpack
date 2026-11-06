"use strict";

const System = require("../../../helpers/fakeSystem");

module.exports = {
	beforeExecute() {
		System.init({
			"false-value": { default: false },
			"zero-value": { default: 0 },
			"empty-value": { default: "" },
			"null-value": { default: null },
			"undefined-value": { default: undefined },
			"nan-value": { default: Number.NaN },
			"truthy-value": { default: "value" },
			"commonjs-value": { named: "value" }
		});
	},
	moduleScope(scope) {
		scope.System = System;
	},
	afterExecute() {
		System.execute("defaults-true");
		System.execute("defaults-false");
	}
};
