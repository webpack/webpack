"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		threads: {
			max: 1,
			loaders: {
				parallelJobs: 1
			}
		}
	},
	module: {
		rules: [
			{
				test: /(value|loaded)\.js$/,
				use: ["./loader"],
				threads: true
			}
		]
	}
};
