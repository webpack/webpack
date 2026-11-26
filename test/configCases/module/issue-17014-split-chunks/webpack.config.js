"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		module: true
	},
	target: "es2020",
	optimization: {
		splitChunks: {
			cacheGroups: {
				common: {
					test: /common\.js/,
					minSize: 0,
					chunks: "all",
					filename: "common.mjs"
				}
			}
		}
	}
};
