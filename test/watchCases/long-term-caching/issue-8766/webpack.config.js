"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	output: {
		chunkFilename: "[contenthash].js"
	}
};
