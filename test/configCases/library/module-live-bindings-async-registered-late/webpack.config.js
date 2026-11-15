"use strict";

/** @type {import("../../../../").Configuration[]} */
const configurations = [];
for (const target of ["node14", "web", "universal"]) {
	for (const sharedRuntime of [false, true]) {
		const index = configurations.length;
		configurations.push({
			target,
			entry: {
				main: "./index.js",
				library: {
					import: "./library.js",
					dependOn: sharedRuntime ? undefined : "main",
					library: { type: "module" }
				}
			},
			output: { module: true, filename: `${index}/[name].mjs` },
			optimization: {
				concatenateModules: false,
				runtimeChunk: sharedRuntime ? "single" : false
			}
		});
	}
}

module.exports = configurations;
