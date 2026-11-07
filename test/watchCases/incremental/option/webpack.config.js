"use strict";

/** @import { Configuration, ModuleGraph } from "webpack" */

/** @type {Configuration[]} */
const configurations = [];
/** @type {Configuration["incremental"][]} */
const values = [
	undefined,
	true,
	false,
	{},
	{ buildModuleGraph: true },
	{ buildModuleGraph: false }
];

/** @type {Configuration["cache"][]} */
const caches = [false, true, { type: "filesystem" }];

for (const cache of caches) {
	for (const incremental of values) {
		const enabled =
			incremental !== false &&
			(typeof incremental !== "object" ||
				incremental.buildModuleGraph !== false);
		configurations.push({
			mode: "development",
			cache: typeof cache === "object" ? { ...cache } : cache,
			incremental,
			module: { unsafeCache: false },
			plugins: [
				(compiler) => {
					/** @type {ModuleGraph | undefined} */
					let previousGraph;
					let stableRequests = 0;
					compiler.hooks.normalModuleFactory.tap(
						"CheckIncrementalOption",
						(factory) => {
							stableRequests = 0;
							factory.hooks.beforeResolve.tap(
								"CheckIncrementalOption",
								(data) => {
									if (data.request === "./stable") stableRequests++;
								}
							);
						}
					);
					compiler.hooks.afterCompile.tap(
						"CheckIncrementalOption",
						(compilation) => {
							if (compiler.watchMode && previousGraph !== undefined) {
								expect(compilation.moduleGraph === previousGraph).toBe(enabled);
								expect(stableRequests).toBe(enabled ? 0 : 1);
							}
							previousGraph = compilation.moduleGraph;
						}
					);
				}
			]
		});
	}
}

module.exports = configurations;
