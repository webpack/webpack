"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { css: true },
	// `javascript: false` keeps the bundle readable; the CSS this asserts is
	// embedded in it, so terser would only obscure the string under test.
	optimization: { minimize: { javascript: false } },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	}
};
