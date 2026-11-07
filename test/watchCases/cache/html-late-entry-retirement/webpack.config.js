"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @returns {import("webpack").Configuration} watch configuration */
module.exports = () => ({
	mode: "development",
	target: "web",
	devtool: false,
	cache: { type: "memory" },
	entry: { main: "./index.js", page: "./page.html" },
	experiments: { html: true },
	node: { __dirname: false },
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	plugins: [
		(compiler) => {
			let failed = false;
			compiler.hooks.compilation.tap("CheckLateEntries", (compilation) => {
				/** @type {string[]} */
				const rebuilt = [];
				compilation.hooks.buildModule.tap("CheckLateEntries", (module) => {
					rebuilt.push(module.identifier());
				});
				compilation.hooks.afterSeal.tap("CheckLateEntries", () => {
					if (!compiler.watchMode || currentWatchStep.step !== "1") return;
					for (const filename of ["page.html", "app.js", "value.js"]) {
						expect(rebuilt).not.toContain(
							path.join(compiler.context, filename)
						);
					}
				});
			});
			compiler.hooks.finishMake.tap(
				{ name: "FailBeforeLateEntries", stage: -Infinity },
				() => {
					if (compiler.watchMode && currentWatchStep.step === "5" && !failed) {
						failed = true;
						throw new Error("Injected failure before late entries");
					}
				}
			);
		}
	]
});
