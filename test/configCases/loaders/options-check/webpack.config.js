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
			},
			{
				test: /e\.js$/,
				loader: "./lazy-loader",
				options: { name: "valid" }
			},
			{
				test: /f\.js$/,
				loader: "./lazy-loader",
				options: { name: 42 }
			},
			{
				test: /g\.js$/,
				loader: "./named-loader",
				options: { name: 42 }
			}
		]
	}
};
