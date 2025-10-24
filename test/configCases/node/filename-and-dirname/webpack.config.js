"use strict";

const webpack = require("../../../../");

const values = [
	true,
	/* false, */ "warn-mock",
	"mock",
	"node-module",
	"eval-only"
];

/** @type {import("../../../../").Configuration[]} */
const config = [];

// CommonJS
config.push(
	...values
		.filter((item) => item !== "node-module")
		.map((value) => ({
			target: "node",
			node: {
				__filename: value,
				__dirname: value
			},
			output: {
				module: value === "node-module"
			},
			experiments: {
				outputModule: value === "node-module"
			},
			plugins: [
				new webpack.DefinePlugin({
					NODE_VALUE: typeof value === "boolean" ? value : JSON.stringify(value)
				})
			]
		}))
);

// ES modules
config.push(
	...values
		.filter((item) => item !== "eval-only")
		.map((value) => ({
			target: "node",
			node: {
				__filename: value,
				__dirname: value
			},
			output: {
				module: true
			},
			experiments: {
				outputModule: true
			},
			plugins: [
				new webpack.DefinePlugin({
					NODE_VALUE: typeof value === "boolean" ? value : JSON.stringify(value)
				})
			]
		}))
);

// // ES modules with support `import.meta.dirname` and `import.meta.filename`
config.push(
	...values
		.filter((item) => item !== "eval-only")
		.map((value) => ({
			target: "node",
			node: {
				__filename: value,
				__dirname: value
			},
			output: {
				module: true,
				environment: {
					importMetaDirnameAndFilename: true
				}
			},
			experiments: {
				outputModule: true
			},
			plugins: [
				new webpack.DefinePlugin({
					NODE_VALUE: typeof value === "boolean" ? value : JSON.stringify(value)
				})
			]
		}))
);

module.exports = config;
