"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	optimization: { chunkIds: "named" },
	output: {
		filename: "main.js?version=[contenthash]",
		chunkFilename: "[name].js?version=[contenthash]#fragment"
	}
};
