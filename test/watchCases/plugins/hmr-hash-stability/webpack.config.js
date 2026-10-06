"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: { moduleIds: "size", chunkIds: "size" },
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
