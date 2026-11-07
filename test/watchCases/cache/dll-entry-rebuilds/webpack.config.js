"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: ["./index.js"], other: ["./other.js"] },
	output: { filename: "[name].js", library: { type: "commonjs2" } },
	plugins: [
		(compiler) => {
			new compiler.webpack.DllPlugin({
				path: path.join(
					/** @type {string} */ (compiler.options.output.path),
					"[name]-manifest.json"
				)
			}).apply(compiler);
			new compiler.webpack.BannerPlugin({
				raw: true,
				footer: true,
				test: /main\.js$/,
				banner: 'module.exports("./index.js");'
			}).apply(compiler);

			/** @type {import("webpack").ModuleGraph | undefined} */
			let previousGraph;
			/** @type {Map<string | undefined, import("webpack").Dependency>} */
			let previousEntries = new Map();
			compiler.hooks.compilation.tap("CheckDllEntries", (compilation) => {
				const reused = previousGraph === compilation.moduleGraph;
				const retainedEntries = previousEntries;
				previousGraph = compilation.moduleGraph;
				previousEntries = new Map();
				/** @type {(string | undefined)[]} */
				const entries = [];
				compilation.hooks.succeedEntry.tap(
					"CheckDllEntries",
					(dependency, options) => {
						expect(dependency.type).toBe("dll entry");
						if (reused) {
							expect(dependency).toBe(retainedEntries.get(options.name));
						}
						previousEntries.set(options.name, dependency);
						entries.push(options.name);
					}
				);
				compilation.hooks.finishModules.tap("CheckDllEntries", () => {
					expect(entries.sort()).toEqual(["main", "other"]);
				});
			});
		}
	]
};
