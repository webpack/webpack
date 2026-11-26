"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	optimization: { moduleIds: "size", chunkIds: "size" },
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
