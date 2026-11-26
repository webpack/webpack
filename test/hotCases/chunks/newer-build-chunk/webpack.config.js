"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				dep: {
					test: /[\\/]dep\.js$/,
					name: "shared",
					chunks: "all",
					enforce: true,
					minSize: 0
				}
			}
		}
	}
};
