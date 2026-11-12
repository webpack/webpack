"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	cache: { type: "memory" },
	module: { unsafeCache: true },
	entry: { main: "./index.js", page: "./page.html" },
	experiments: { html: true },
	node: { __dirname: false },
	output: { filename: "[name].js" },
	plugins: [
		(compiler) => {
			/** @type {import("webpack").Dependency | undefined} */
			let retainedDependency;
			compiler.hooks.compilation.tap("ReuseParsedDependency", (compilation) => {
				compilation.hooks.succeedModule.tap(
					"ReuseParsedDependency",
					(module) => {
						if (
							module.nameForCondition() !==
							path.join(compiler.context, "app.js")
						) {
							return;
						}
						const index = module.dependencies.findIndex(
							(dependency) =>
								"request" in dependency && dependency.request === "./shared.js"
						);
						if (index === -1) return;
						if (retainedDependency) {
							module.dependencies[index] = retainedDependency;
						} else {
							retainedDependency = module.dependencies[index];
						}
					}
				);
			});
		}
	]
};
