"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: {
		main: "./index.js",
		// `a` holds the module itself, `b` reaches it in a chunk of its own
		a: { import: "./a.js", library: { type: "module" } },
		b: { import: "./b.js", library: { type: "module" } },
		// `c` shares `a`'s runtime and reads the module from `a`'s chunk
		c: { import: "./c.js", dependOn: "a", library: { type: "module" } },
		// `d` holds the module alone in its runtime, so it writes the name directly
		d: { import: "./d.js", library: { type: "module" } }
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	optimization: {
		concatenateModules: false,
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					chunks: (chunk) => chunk.name === "b",
					name: "shared",
					enforce: true
				}
			}
		}
	}
};
