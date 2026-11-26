"use strict";

/** @import { Configuration } from "../../../../" */

// The jsonp chunk loader, the prefetch hint and the startup code.
/** @type {Configuration} */
module.exports = {
	target: ["web", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
