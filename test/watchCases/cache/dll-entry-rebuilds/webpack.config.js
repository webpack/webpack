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

			compiler.hooks.compilation.tap("CheckDllEntries", (compilation) => {
				/** @type {(string | undefined)[]} */
				const entries = [];
				compilation.hooks.succeedEntry.tap(
					"CheckDllEntries",
					(dependency, options) => {
						expect(dependency.type).toBe("dll entry");
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
