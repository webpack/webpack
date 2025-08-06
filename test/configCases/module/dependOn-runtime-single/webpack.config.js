"use strict";

/** @type {import("../../../../types").Configuration} */
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
		filename: "[name].mjs",
		library: {
			type: "module"
		}
	},
	target: ["web", "es2020"],
	experiments: {
		outputModule: true
	},
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
