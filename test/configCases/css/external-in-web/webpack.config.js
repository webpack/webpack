"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "web",
		optimization: {
			chunkIds: "named"
		},
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		optimization: {
			chunkIds: "named"
		},
		experiments: {
			css: true,
			outputModule: true
		}
	}
];
