"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	cache: false,
	module: {
		rules: [
			{ test: /(?:app|transient)\.js$/, use: require.resolve("./loader") }
		]
	},
	entry: { main: "./index.js", page: "./page.html", landing: "./shared.html" },
	experiments: { html: true },
	node: { __dirname: false },
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	plugins: [
		(compiler) => {
			/** @type {import("webpack").Module | undefined} */
			let previousApp;
			compiler.hooks.make.tapAsync(
				"CheckRetainedSubtrees",
				(compilation, callback) => {
					const app = [...compilation.modules].find(
						(module) =>
							module.nameForCondition() ===
							path.join(compiler.context, "app.js")
					);
					if (!app) return callback();
					compilation.addModule(app, (error) => callback(error));
				}
			);
			compiler.hooks.afterCompile.tap(
				"CheckRetainedSubtrees",
				(compilation) => {
					if (!compiler.watchMode) return;
					const app = [...compilation.modules].find(
						(module) =>
							module.nameForCondition() ===
							path.join(compiler.context, "app.js")
					);
					expect(app).toBeDefined();
					if (currentWatchStep.step === "1") {
						expect(Object.is(app, previousApp)).toBe(true);
					}
					previousApp = app;
				}
			);
		}
	]
};
