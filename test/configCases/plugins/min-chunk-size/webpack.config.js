"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new webpack.optimize.MinChunkSizePlugin({
			minChunkSize: 30
		})
	]
};
