"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = [
	{
		entry: {
			index: {
				import: ["./index.js", "./scriptA.js", "./scriptB.js", "./test.js"]
			}
		},
		target: "web",
		output: {
			library: {
				type: "global"
			},

			filename: "[name].js"
		}
	},
	{
		entry: {
			index: {
				import: ["./index.js", "./scriptA.js", "./scriptB.js", "./test2.js"]
			},
			vendors: ["react"]
		},

		target: "web",
		output: {
			library: {
				type: "global"
			},

			filename: "[name].js"
		},
		optimization: {
			usedExports: false,
			splitChunks: {
				chunks: "all"
			}
		}
	}
];
