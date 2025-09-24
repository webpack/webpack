"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		context: path.join(__dirname, "../external"),
		entry: "../external-in-node/index.js",
		target: "node",
		optimization: {
			chunkIds: "named",
			moduleIds: "named"
		},
		experiments: {
			css: true
		}
	},
	{
		context: path.join(__dirname, "../external"),
		entry: "../external-in-node/index.js",
		target: "node",
		optimization: {
			chunkIds: "named",
			moduleIds: "named"
		},
		experiments: {
			css: true,
			outputModule: true
		}
	}
];
