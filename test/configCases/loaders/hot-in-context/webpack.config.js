"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		// no hmr
	},
	{
		// with hmr
		plugins: [new webpack.HotModuleReplacementPlugin()]
	}
];
