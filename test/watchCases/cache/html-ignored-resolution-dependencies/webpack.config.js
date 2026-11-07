"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((unsafeCache, index) => ({
	mode: "development",
	target: "web",
	devtool: false,
	entry: { page: "./page.html" },
	experiments: { html: true },
	cache: { type: "memory" },
	module: { unsafeCache },
	output: {
		filename: `[name]${index}.js`,
		chunkFilename: `[name]${index}.js`,
		clean: false
	},
	plugins: [
		(compiler) => {
			const flag = path.join(compiler.context, "enabled.txt");
			compiler.hooks.normalModuleFactory.tap("ConditionalIgnore", (factory) => {
				factory.hooks.beforeResolve.tap("ConditionalIgnore", (data) => {
					if (data.request !== "./optional") return;
					data.fileDependencies.add(flag);
					data.cacheable = false;
					if (fs.readFileSync(flag, "utf8").trim() === "off") return false;
				});
			});
			compiler.hooks.afterCompile.tap("ConditionalIgnore", (compilation) => {
				expect(compilation.fileDependencies.has(flag)).toBe(true);
			});
		}
	]
}));
