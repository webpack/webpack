"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	performance: {
		hints: false
	},
	optimization: {
		splitChunks: {
			minSize: 1
		},
		chunkIds: "named"
	}
};
