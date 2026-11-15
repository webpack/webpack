"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["node14", "web", "universal"].map((target, index) => ({
	target,
	entry: {
		main: "./index.js",
		a: { import: "./library.js", library: { type: "module" } },
		b: { import: "./aliased-library.js", library: { type: "module" } },
		direct: { import: "./library.js", library: { type: "module" } },
		consumer: { import: "./consumer.js", library: { type: "module" } }
	},
	output: {
		module: true,
		filename: `[name]-${index}.mjs`,
		chunkFilename: `[name]-${index}.chunk.mjs`
	},
	externalsType: "module",
	externals: {
		"./a.mjs": `./a-${index}.mjs`,
		"./b.mjs": `./b-${index}.mjs`,
		"./direct.mjs": `./direct-${index}.mjs`,
		"./consumer.mjs": `./consumer-${index}.mjs`
	},
	optimization: {
		concatenateModules: false,
		usedExports: true,
		mangleExports: "size",
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js$/,
					chunks: (chunk) => chunk.name !== "direct",
					name: "shared",
					enforce: true
				}
			}
		}
	}
}));
