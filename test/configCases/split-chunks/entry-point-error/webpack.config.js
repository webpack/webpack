"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		vendors: ["./module"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		emitOnErrors: true,
		splitChunks: {
			cacheGroups: {
				vendors: {
					test: /module/,
					chunks: "all",
					name: "vendors",
					enforce: true
				}
			}
		}
	}
};
