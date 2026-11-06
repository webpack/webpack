"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: [
					{
						loader: "./loader",
						options: {
							value: 1
						}
					}
				],
				threads: true
			}
		]
	}
};
