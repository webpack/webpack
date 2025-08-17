"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = [
	{
		entry: "./entry.js",
		output: {
			filename: "lib.js",
			chunkFilename: "chunk.[chunkhash:8].js",
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./index.js",
		output: {
			filename: "index.js"
		}
	}
];
