"use strict";

const { ProvidePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "node", output: { module: false } },
	{ target: "web", output: { module: false } },
	{ target: "web", output: { module: true } },
	{ target: ["web", "node"], output: { module: true } },
	// `import.defer` of a generator-lowered async module is a separate bug
	{
		target: ["node", "es2016"],
		entry: "./index.js",
		output: { module: false }
	},
	{
		target: "node",
		entry: "./non-arrow.js",
		experiments: { deferImport: false },
		output: { module: false, environment: { arrowFunction: false } }
	}
].map((options, index) => ({
	entry: ["./index.js", "./defer.js"],
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
			providedExternal: "async-external",
			providedExternalValue: ["async-external", "value"]
		})
	]
}));
