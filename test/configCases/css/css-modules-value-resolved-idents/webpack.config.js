"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		uniqueName: "value-resolved-idents"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/i,
				type: "css/module"
			}
		]
	}
};
