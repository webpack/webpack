"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Module, NormalModule } from "webpack" */

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: false,
	plugins: [
		(compiler) => {
			new compiler.webpack.PrefetchPlugin("./prefetched.js").apply(compiler);
			compiler.hooks.compilation.tap("CheckModuleEvents", (compilation) => {
				/** @type {Map<Module, string[]>} */
				const events = new Map();
				for (const name of /** @type {const} */ ([
					"succeedModule",
					"stillValidModule"
				])) {
					compilation.hooks[name].tap("CheckModuleEvents", (module) => {
						const names = events.get(module) || [];
						names.push(name);
						events.set(module, names);
					});
				}
				compilation.hooks.finishModules.tap("CheckModuleEvents", () => {
					const rebuilding =
						compiler.watchMode && currentWatchStep.step !== "0";
					const actual = [...events].map(([module, names]) => [
						path.basename(/** @type {NormalModule} */ (module).resource),
						names
					]);
					expect(actual.sort()).toEqual(
						["index.js", "plain.js", "prefetched.js", "steady.js", "value.js"]
							.filter(
								(name) => name !== "steady.js" || currentWatchStep.step !== "3"
							)
							.map((name) => [
								name,
								[
									rebuilding &&
									name !== "value.js" &&
									!(name === "index.js" && currentWatchStep.step === "3") &&
									!(name === "prefetched.js" && currentWatchStep.step === "2")
										? "stillValidModule"
										: "succeedModule"
								]
							])
					);
				});
			});
			compiler.hooks.finishMake.tapAsync(
				"CheckModuleEvents",
				(compilation, callback) => {
					const module = /** @type {Module} */ (
						[...compilation.modules].find(
							(module) =>
								/** @type {NormalModule} */ (module).resource ===
								path.join(compiler.context, "index.js")
						)
					);
					// A later plugin must not report the retained module a second time.
					compilation.buildModule(module, (error) => callback(error));
				}
			);
		}
	]
};
