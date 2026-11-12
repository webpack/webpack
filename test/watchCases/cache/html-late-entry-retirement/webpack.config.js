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
			/** @type {import("webpack").ModuleGraphConnection | undefined} */
			let previousConnection;
			/** @type {string[]} */
			let requests;
			compiler.hooks.normalModuleFactory.tap("CheckLateEntries", (factory) => {
				requests = [];
				factory.hooks.beforeResolve.tap("CheckLateEntries", (data) => {
					requests.push(data.request);
				});
			});
			compiler.hooks.compilation.tap("CheckLateEntries", (compilation) => {
				/** @type {string[]} */
				const rebuilt = [];
				compilation.hooks.buildModule.tap("CheckLateEntries", (module) => {
					rebuilt.push(module.identifier());
				});
				compilation.hooks.afterSeal.tap("CheckLateEntries", () => {
					if (!compiler.watchMode) return;
					const app = [...compilation.modules].find(
						(module) =>
							module.identifier() === path.join(compiler.context, "app.js")
					);
					const connection =
						app &&
						[...compilation.moduleGraph.getOutgoingConnections(app)].find(
							(candidate) =>
								candidate.module &&
								candidate.module.identifier() ===
									path.join(compiler.context, "value.js")
						);
					if (currentWatchStep.step === "0") {
						expect(connection).toBeDefined();
						previousConnection = connection;
					}
					if (currentWatchStep.step !== "1") return;
					expect(Object.is(connection, previousConnection)).toBe(true);
					expect(requests).not.toContain("./value.js");
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
