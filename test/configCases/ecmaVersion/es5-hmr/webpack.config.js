"use strict";

const webpack = require("../../../../");

// The hot-update runtime: its own loader, its own manifest fetch, its own
// module-replacement bookkeeping, and the same es5 obligation as the rest.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es5"],
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
