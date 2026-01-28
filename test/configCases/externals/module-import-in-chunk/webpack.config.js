"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "node14",
	experiments: { outputModule: true },
	externalsType: "module-import",
	externals: {
		"external-lib": "node:fs"
	},
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		module: true
	}
};
