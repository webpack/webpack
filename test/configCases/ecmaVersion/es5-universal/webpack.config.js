"use strict";

/** @import { Configuration } from "../../../../" */

// One bundle for a browser and for Node.js, so no single global identifier is
// defined on both sides. A neutral target picks no script chunk format itself.
/** @type {Configuration} */
module.exports = {
	target: ["web", "node", "es5"],
	output: {
		chunkFormat: "array-push",
		chunkLoading: "jsonp",
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
