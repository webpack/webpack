"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		threads: {
			max: 2
		}
	},
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: [
					{
						loader: "./loader",
						options: {
							value: 42,
							pattern: /worker/
						}
					}
				],
				threads: true
			}
		]
	}
};
