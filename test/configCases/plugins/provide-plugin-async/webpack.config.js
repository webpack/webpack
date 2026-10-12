"use strict";

const { ProvidePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "node", output: { module: false } },
	{ target: "web", output: { module: false } },
	{ target: "web", output: { module: true } },
	{ target: ["web", "node"], output: { module: true } },
	{ target: ["node", "es2016"], output: { module: false } },
	{
		target: "node",
		entry: "./non-arrow.js",
		experiments: { deferImport: false },
		output: { module: false, environment: { arrowFunction: false } }
	}
].map((options, index) => ({
	experiments: { deferImport: true },
	...options,
	mode: "production",
	devtool: false,
	output: {
		...options.output,
		strictModuleErrorHandling: true,
		filename: `bundle${index}.${options.output.module ? "mjs" : "js"}`
	},
	optimization: {
		inlineExports: true
	},
	externals: {
		"async-external": "promise Promise.resolve({ value: 43 })"
	},
	plugins: [
		new ProvidePlugin({
			providedModule: "./async.js",
			providedValue: ["./async.js", "value"],
			providedConstant: ["./async.js", "constant"],
			providedDefault: ["./async.js", "default"],
			"provided.nested": ["./async.js", "nested", "value"],
			providedFailure: ["./failure.js", "default"],
			providedInlined: ["./inlined.js", "value"],
			providedCommonJS: ["./consumer.cjs", "value"],
			providedCycle: "./cycle-async.js",
			providedExternal: "async-external",
			providedExternalValue: ["async-external", "value"]
		})
	]
}));
