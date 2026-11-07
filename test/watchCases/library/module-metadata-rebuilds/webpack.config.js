"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	target: "node14",
	devtool: false,
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } },
		modern: { import: "./library.js", library: { type: "modern-module" } },
		mirrored: { import: "./mirrored.js", library: { type: "module" } },
		async: { import: "./async.js", library: { type: "module" } }
	},
	output: { module: true, filename: "[name].mjs" },
	optimization: {
		minimize: false,
		concatenateModules: false,
		providedExports: true,
		usedExports: false
	}
};
