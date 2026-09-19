"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	// The emitted entries are imported back by `main` to read what the library exports.
	externals: ["./middle.mjs", "./leaf.mjs"],
	externalsType: "module",
	entry: {
		main: "./index.js",
		shared: "./shared.js",
		middle: { import: "./middle.js", dependOn: "shared" },
		leaf: { import: "./leaf.js", dependOn: "middle" }
	},
	output: {
		filename: "[name].mjs",
		module: true,
		library: { type: "module" }
	},
	experiments: {
		outputModule: true
	}
};
