"use strict";

/** @type {import("../../../../").Configuration[]} */
const configurations = [];
/** @type {import("../../../../").Configuration["optimization"][]} */
const optimizations = [
	{ concatenateModules: false },
	{ concatenateModules: true },
	{ concatenateModules: false, runtimeChunk: "single" }
];
for (const target of ["node14", "web", "universal"]) {
	for (const optimization of optimizations) {
		const index = configurations.length;
		configurations.push({
			target,
			entry: {
				main: "./index.js",
				library: { import: "./library.js", library: { type: "module" } }
			},
			output: { module: true, filename: `[name]-${index}.mjs` },
			externalsType: "module",
			externals: { "./library.mjs": `./library-${index}.mjs` },
			optimization
		});
	}
}

module.exports = configurations;
