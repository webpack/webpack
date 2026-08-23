"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	output: {
		environment: {
			arrowFunction: true,
			asyncFunction: false,
			const: true,
			destructuring: true,
			forOf: true,
			generator: true,
			templateLiteral: true
		}
	},
	performance: {
		hints: "warning",
		legacyJavascript: true
	}
};
