"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: { threads: { max: 1 } },
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: ["./loader"],
				threads: true
			},
			{
				test: /nested\.js$/,
				use: ["./nested-loader"]
			}
		]
	}
};
