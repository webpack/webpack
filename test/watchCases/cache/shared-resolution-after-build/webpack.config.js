"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration["cache"][]} */
const caches = [false, true, { type: "filesystem" }];

/** @type {import("webpack").Configuration[]} */
module.exports = caches.map((cache, index) => ({
	mode: "development",
	cache,
	output: { filename: `bundle${index}.js`, clean: false },
	parallelism: 1,
	resolve: { modules: ["packages", "node_modules"] }
}));

module.exports.push({
	mode: "development",
	entry: {},
	output: { filename: `bundle${caches.length}.js`, clean: false },
	parallelism: 1,
	resolve: { modules: ["packages", "node_modules"] },
	plugins: [
		(compiler) => {
			const { EntryPlugin, dependencies } = compiler.webpack;
			compiler.hooks.compilation.tap(
				"SharedEntryResolution",
				(compilation, { normalModuleFactory }) => {
					compilation.dependencyFactories.set(
						dependencies.EntryDependency,
						normalModuleFactory
					);
				}
			);
			compiler.hooks.make.tapPromise(
				"SharedEntryResolution",
				async (compilation) => {
					for (const request of ["pkg/left", "pkg/right", "./index.js"]) {
						await new Promise((resolve, reject) => {
							compilation.addEntry(
								compiler.context,
								EntryPlugin.createDependency(request, { name: "main" }),
								{ name: "main" },
								(error, module) => {
									if (error) return reject(error);
									if (request === "pkg/right") {
										const step = Number(currentWatchStep.step);
										expect(module && module.identifier()).toContain(
											step === 1 || step === 2 ? "other.js" : "shared.js"
										);
									}
									resolve(null);
								}
							);
						});
					}
				}
			);
		}
	]
});
