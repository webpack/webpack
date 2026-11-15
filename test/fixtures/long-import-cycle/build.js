"use strict";

// Builds an import cycle of `process.argv[2]` modules into `process.argv[3]`, then
// prints a report. Run with a small `--stack-size`, so recursion per module overflows.
const path = require("path");
const webpack = require("../../../lib/index");
const ConcatenatedModule = require("../../../lib/optimize/ConcatenatedModule");

const length = Number(process.argv[2]);
const outputPath = process.argv[3];

webpack(
	{
		mode: "production",
		context: __dirname,
		entry: "./index.js",
		output: {
			path: outputPath,
			library: { type: "commonjs2" }
		},
		optimization: { minimize: false, concatenateModules: true },
		module: {
			rules: [
				{
					test: /link\.js$/,
					loader: require.resolve("./link-loader.js"),
					options: { length }
				}
			]
		}
	},
	(err, stats) => {
		if (err) throw err;
		const { compilation } = /** @type {import("../../../lib/stats/Stats")} */ (
			stats
		);
		/** @type {number[]} */
		const concatenated = [];
		for (const module of compilation.modules) {
			if (module instanceof ConcatenatedModule) {
				concatenated.push(module.modules.length);
			}
		}
		const errors = compilation.errors.map((error) => error.message);
		/** @type {{ count: number, first: number } | undefined} */
		let result;
		if (errors.length === 0) {
			result = require(path.join(outputPath, "main.js")).default;
		}
		process.stdout.write(JSON.stringify({ errors, concatenated, result }));
	}
);
