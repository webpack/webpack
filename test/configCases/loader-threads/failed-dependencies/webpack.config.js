"use strict";

const path = require("path");

const DEPENDENCY = path.join(__dirname, "failed-dependency.txt");
const LOADER = path.join(__dirname, "loader.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: { threads: { max: 1 } },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("test", (compilation) => {
					compilation.hooks.failedModule.tap("test", (module) => {
						if (!module.identifier().endsWith("value.js")) return;
						if (module.buildInfo === undefined) return;
						if (!module.buildInfo.fileDependencies.has(DEPENDENCY)) {
							throw new Error("failed loader dependencies were not merged");
						}
						if (
							module.buildInfo.buildDependencies === undefined ||
							!module.buildInfo.buildDependencies.has(LOADER)
						) {
							throw new Error(
								"failed loader build dependencies were not merged"
							);
						}
					});
				});
			}
		}
	],
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: ["./loader"],
				threads: true
			}
		]
	}
};
