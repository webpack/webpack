"use strict";

const { javascript, sources } = require("../../../../");

/** @param {import("../../../../").Compiler} compiler compiler */
const renderPlugin = (compiler) => {
	compiler.hooks.compilation.tap("RenderPlugin", (compilation) => {
		javascript.JavascriptModulesPlugin.getCompilationHooks(
			compilation
		).renderModuleContent.tap(
			{ name: "RenderPlugin", stage: -200 },
			(source) => {
				const text = String(source.source());
				const marker = '"before rendering"';
				const start = text.indexOf(marker);
				if (start < 0) return source;
				const result = new sources.ReplaceSource(source);
				result.replace(start, start + marker.length - 1, '"after rendering"');
				return result;
			}
		);
	});
};

let nextIndex = 0;

/** @type {import("../../../../").Configuration[]} */
module.exports = ["node14", "web", ["web", "node14"]].flatMap(
	(target, targetIndex) =>
		["./async.js", "./barrel.js", ["./store.js", "./own.js"]].flatMap(
			(library) =>
				[false, true].flatMap((concatenateModules) =>
					(Array.isArray(library) ? [false] : [false, "single"]).map(
						(runtimeChunk) => {
							const index = nextIndex++;
							return {
								mode: targetIndex === 1 ? "development" : "production",
								devtool: false,
								plugins: [renderPlugin],
								target,
								entry: {
									main: "./index.js",
									library: {
										import: library,
										library: { type: "module", entryExports: "all" }
									},
									...(index === 0
										? {
												legacy: {
													import: "./store.js",
													library: { type: "modern-module" }
												}
											}
										: {})
								},
								output: { module: true, filename: `[name]-${index}.mjs` },
								externalsType: "module",
								externals: { "./library.mjs": `./library-${index}.mjs` },
								optimization: {
									concatenateModules,
									runtimeChunk,
									minimize: targetIndex === 2,
									minimizer: ["..."],
									// Keep the inferred names that the runtime assertions observe.
									minimizeOptions: {
										javascript: { compress: false, mangle: false }
									}
								}
							};
						}
					)
				)
		)
);
