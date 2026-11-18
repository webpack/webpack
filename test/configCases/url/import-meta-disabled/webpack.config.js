"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: "./index.js",
	output: {
		module: true,
		filename: "bundle.mjs"
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		},
		rules: [
			{
				test: /object-form\.js$/,
				parser: {
					importMeta: {
						url: false
					}
				}
			}
		]
	}
};
