"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((cache, index) => ({
	mode: "development",
	cache: cache ? { type: "memory" } : false,
	output: { filename: `bundle${index}.js`, clean: false },
	optimization: {
		concatenateModules: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("EntryDiagnostics", (compilation) => {
				compilation.hooks.succeedEntry.tap(
					"EntryDiagnostics",
					(dependency, options, module) => {
						module.clearWarningsAndErrors();
						if (currentWatchStep.step === "1") {
							module.addWarning(
								new compiler.webpack.WebpackError(
									"Entry warning from succeedEntry"
								)
							);
						}
						if (currentWatchStep.step === "2") {
							module.addError(
								new compiler.webpack.WebpackError(
									"Entry diagnostic from succeedEntry"
								)
							);
						}
					}
				);
			});
		}
	]
}));
