"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// target: node so the test code can `require("fs")` to inspect the
	// emitted bundle. The CSS concatenation path under test does not
	// depend on the target.
	target: "node",
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.text\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	experiments: {
		css: true
	}
};
