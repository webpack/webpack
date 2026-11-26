"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	optimization: { chunkIds: "named" },
	output: {
		chunkFilename: "[id].js"
	}
};
