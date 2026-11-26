"use strict";

/** @import { Configuration } from "../../../../" */

// No css module anywhere: the only stylesheet in the build is an `@import` external,
// so nothing requires `hasCssModules` and the loading runtime has to be asked for here.

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { css: true },
	optimization: { chunkIds: "named", minimize: false },
	externals: { "./ext.css": "css-import ./ext.css" },
	output: { chunkFilename: "[name].js" }
};
