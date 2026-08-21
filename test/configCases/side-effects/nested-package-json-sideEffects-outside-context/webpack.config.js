"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: path.join(__dirname, "src"),
	mode: "production",
	entry: "./index.js",
	resolve: {
		modules: [path.join(__dirname, "node_modules"), "node_modules"]
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		providedExports: true,
		concatenateModules: false,
		minimize: false
	}
};
