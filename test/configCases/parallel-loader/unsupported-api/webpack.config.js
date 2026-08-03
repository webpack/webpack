"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		parallel: { loader: { workers: 1, poolTimeout: 0 } }
	},
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: ["./emit-loader"]
			}
		]
	}
};
