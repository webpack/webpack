"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /string\.js$/,
				use: ["./check-string-loader", "./bom-loader"]
			},
			{
				test: /buffer\.js$/,
				use: ["./check-buffer-loader", "./bom-loader"]
			}
		]
	}
};
