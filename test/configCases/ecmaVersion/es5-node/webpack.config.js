"use strict";

/** @import { Configuration } from "../../../../" */

// `require` chunk loading. Node.js is not an old browser, but the runtime
// module is shared code and `target: es5` is a supported way to ask for it.
/** @type {Configuration} */
module.exports = {
	target: ["node", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
