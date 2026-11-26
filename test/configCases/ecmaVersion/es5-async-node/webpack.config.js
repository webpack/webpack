"use strict";

/** @import { Configuration } from "../../../../" */

// Read-file chunk loading, the async-node counterpart of the `require` one.
/** @type {Configuration} */
module.exports = {
	target: ["async-node", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
