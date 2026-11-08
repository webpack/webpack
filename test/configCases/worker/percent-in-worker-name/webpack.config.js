"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "[name].js"
		},
		target: "web"
	},
	{
		// a module worker
		output: {
			module: true,
			filename: "[name].mjs",
			chunkFilename: "[name].mjs",
			// the worker URL is an https: one, as in a browser
			workerPublicPath: "https://test.cases/path/"
		},
		target: "web"
	}
];
