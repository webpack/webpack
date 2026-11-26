"use strict";

/** @import { Configuration } from "../../../../" */

// `importScripts` chunk loading, which is a different runtime module from jsonp
// and has its own es5 obligation.
/** @type {Configuration} */
module.exports = {
	target: ["webworker", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
