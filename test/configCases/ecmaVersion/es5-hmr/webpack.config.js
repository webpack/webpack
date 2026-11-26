"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

// The hot-update runtime: its own loader, its own manifest fetch, its own
// module-replacement bookkeeping, and the same es5 obligation as the rest.
/** @type {Configuration} */
module.exports = {
	target: ["web", "es5"],
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
