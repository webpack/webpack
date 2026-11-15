"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Module, NormalModule } from "webpack" */

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
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
					const expected = [...compilation.modules].map((module) => {
						const name = path.basename(
							/** @type {NormalModule} */ (module).resource
						);
						const built = compilation.builtModules.has(module);
						if (
							rebuilding &&
							name !== "value.js" &&
							!(name === "index.js" && currentWatchStep.step === "3") &&
							!(name === "prefetched.js" && currentWatchStep.step === "2")
						) {
							expect(built).toBe(false);
						}
						// One watch step can produce multiple compilations.
						return [name, [built ? "succeedModule" : "stillValidModule"]];
					});
					expect(actual.sort()).toEqual(expected.sort());
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
