"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		uniqueName: "value-at-rule-prelude"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		rules: [
			{
				test: /no-scoping\.module\.css$/i,
				type: "css/module",
				parser: {
					animation: false,
					container: false,
					customIdents: false
				}
			},
			{
				test: /\.module\.css$/i,
				type: "css/module"
			},
			{
				test: /global\.css$/i,
				type: "css/global"
			}
		]
	}
};
