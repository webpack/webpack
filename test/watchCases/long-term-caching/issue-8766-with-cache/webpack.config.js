"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: true,
	output: {
		chunkFilename: "[contenthash].js"
	}
};
