"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	// force node-commonjs externals reached via ESM import so they get concatenated
	externalsType: "node-commonjs",
	externals: { fs: "fs", path: "path" },
	optimization: { concatenateModules: true },
	output: { module: true },
	experiments: { outputModule: true }
};
