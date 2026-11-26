"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		chunkIds: false
	},
	plugins: [new webpack.ids.DeterministicChunkIdsPlugin()]
};
