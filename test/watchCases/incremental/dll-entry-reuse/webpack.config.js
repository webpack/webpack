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
			compiler.hooks.compilation.tap("CheckDllEntryReuse", (compilation) => {
				const reused = previousGraph === compilation.moduleGraph;
				const entries = previousEntries;
				previousGraph = compilation.moduleGraph;
				previousEntries = new Map();
				compilation.hooks.succeedEntry.tap(
					"CheckDllEntryReuse",
					(dependency, options) => {
						if (reused) expect(dependency).toBe(entries.get(options.name));
						previousEntries.set(options.name, dependency);
					}
				);
			});
		}
	]
};
