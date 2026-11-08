"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "[name].js"
		},
		target: "web"
	},
	// TODO Bun 1.4.4: a relative import() specifier is resolved without decoding
	// its escapes, so the module worker looks for `v%2542.mjs` and times out.
	...(process.versions.bun
		? []
		: [
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
			])
];
