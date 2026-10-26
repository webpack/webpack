"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	module: {
		rules: [
			{
				test: /a\.js$/,
				loader: "./checked-loader",
				options: { name: "valid" }
			},
			{
				test: /b\.js$/,
				loader: "./checked-loader",
				options: { name: 42 }
			},
			{
				test: /c\.js$/,
				loader: "./trusting-loader",
				options: { name: 42 }
			},
			{
				test: /d\.js$/,
				loader: "./stale-loader",
				options: { name: "valid" }
			}
		]
	}
};
