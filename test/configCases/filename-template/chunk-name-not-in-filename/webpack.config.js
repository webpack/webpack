"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	optimization: { chunkIds: "deterministic" },
	output: {
		chunkFilename: "[id].js"
	}
};
