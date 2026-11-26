"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		chunkFilename: "chunk-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
