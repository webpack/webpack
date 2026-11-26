"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = () => ({
	devtool: false,
	mode: "development",
	entry: {
		main: {
			import: "./index.js",
			dependOn: "shared"
		},
		shared: "./common.js"
	},
	output: {
		module: true,
		filename: "[name].mjs",
		library: {
			type: "module"
		}
	},
	target: ["web", "es2020"],
	optimization: {
		minimize: false,
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				separate: {
					test: /separate/,
					chunks: "all",
					filename: "separate.mjs",
					enforce: true
				}
			}
		}
	}
});
