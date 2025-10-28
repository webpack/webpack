"use strict";

const webpack = require("../../../../");

/** @type {(boolean | "warn-mock" | "mock" | "node-module" | "eval-only")[]} */
const values = [true, "warn-mock", "mock", "node-module", "eval-only"];

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
			plugins: [
				new webpack.DefinePlugin({
					NODE_VALUE:
						typeof value === "boolean" ? value : JSON.stringify(value),
					FORMAT: JSON.stringify("cjs")
				})
			]
		}))
);

// ES modules
config.push(
	...values.map((value) => ({
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
				NODE_VALUE: typeof value === "boolean" ? value : JSON.stringify(value),
				FORMAT: JSON.stringify("esm")
			})
		]
	}))
);

// // ES modules with support `import.meta.dirname` and `import.meta.filename`
config.push(
	...values.map((value) => ({
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
				NODE_VALUE: typeof value === "boolean" ? value : JSON.stringify(value),
				FORMAT: JSON.stringify("esm")
			})
		]
	}))
);

config.push({
	entry: "./cjs-false.js",
	target: "node",
	node: {
		__filename: false,
		__dirname: false
	}
});

config.push({
	entry: "./esm-false.js",
	target: "node",
	node: {
		__filename: false,
		__dirname: false
	},
	output: {
		module: true
	},
	experiments: {
		outputModule: true
	}
});

module.exports = config;
