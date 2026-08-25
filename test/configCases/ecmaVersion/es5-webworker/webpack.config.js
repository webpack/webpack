"use strict";

// `importScripts` chunk loading, which is a different runtime module from jsonp
// and has its own es5 obligation.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["webworker", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
