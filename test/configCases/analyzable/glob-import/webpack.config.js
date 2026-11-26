"use strict";

/** @import { Configuration } from "../../../../" */

// `import.meta.glob` loads each match through the context module's own blocks, which
// name no module of their own — the context module holding them does.

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFormat: "module",
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
