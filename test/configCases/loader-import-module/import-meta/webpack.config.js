"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	},
	module: {
		rules: [
			{
				test: /stylesheet\.js$/,
				use: "./loader",
				type: "asset/source"
			}
		]
	}
};
