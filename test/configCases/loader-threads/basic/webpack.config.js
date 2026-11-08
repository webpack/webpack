"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	loader: {
		customValue: 42
	},
	experiments: {
		threads: {
			max: 2
		}
	},
	plugins: [
		{
			apply(compiler) {
				let built = false;
				compiler.hooks.compilation.tap("CheckWorkerLogging", (compilation) => {
					compilation.hooks.succeedModule.tap(
						"CheckWorkerLogging",
						(module) => {
							if (module.identifier().includes("value.js")) built = true;
						}
					);
				});
				compiler.hooks.done.tap("CheckWorkerLogging", (stats) => {
					for (const module of stats.compilation.modules) {
						if (module.identifier().includes("threads|")) {
							throw new Error("threads must not change module identifiers");
						}
					}
					// a cached rebuild does not run the loader, so it logs nothing
					if (!built) return;
					const logging = stats.toJson({ logging: "verbose" }).logging || {};
					const found = Object.values(logging).some((group) =>
						(group.entries || []).some((entry) =>
							JSON.stringify(entry.args || []).includes(
								"loader ran in a worker"
							)
						)
					);
					if (!found) {
						throw new Error("worker logger output missing from stats");
					}
				});
			}
		}
	],
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
