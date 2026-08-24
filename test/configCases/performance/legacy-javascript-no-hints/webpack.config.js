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
			asyncFunction: true,
			const: true,
			destructuring: true,
			forOf: true,
			generator: true,
			templateLiteral: true
		}
	},
	performance: {
		hints: false,
		legacyJavascript: true
	}
};
