"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.modules\.css$/,
				type: "css/module",
				generator: {
					exportsConvention: "camel-case-only"
				}
			}
		]
	}
};
