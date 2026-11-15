"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("../../../..").Configuration} */
module.exports = {
	devtool: false,
	module: {
		rules: [{ test: /index\.js$/, loader: require.resolve("./loader") }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.afterCompile.tap("SameHashUpdates", (compilation) => {
				const report = JSON.parse(
					fs.readFileSync(path.join(compiler.context, "report.json"), "utf8")
				);
				const dependency = path.join(compiler.context, report.file);
				expect(compilation.fileDependencies.has(dependency)).toBe(true);
				expect(
					compilation.fileDependencies.has(
						path.join(
							compiler.context,
							report.file === "first.txt" ? "second.txt" : "first.txt"
						)
					)
				).toBe(false);
				if (report.warn) {
					compilation.warnings.push(
						new compiler.webpack.WebpackError(
							`Watched value: ${fs.readFileSync(dependency, "utf8").trim()}`
						)
					);
				}
			});
		}
	]
};
