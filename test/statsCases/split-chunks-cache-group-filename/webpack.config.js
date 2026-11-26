"use strict";

/** @import { Configuration } from "../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				vendors: {
					chunks: "initial",
					filename: "[name].vendors.js",
					minSize: 1,
					maxInitialSize: 1,
					test: /[\\/]node_modules[\\/]/
				}
			}
		}
	},
	stats: {
		assets: false,
		chunks: true
	}
};
