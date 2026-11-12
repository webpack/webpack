"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: { threads: { max: 1, loaders: { parallelJobs: 1 } } },
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: ["./a-loader"],
				threads: true
			},
			{
				test: /b\.js$/,
				use: ["./b-loader"],
				threads: true
			}
		]
	}
};
