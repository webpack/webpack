"use strict";

const webpack = require("../../../");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	stats: {
		errorStack: false
	},
	plugins: [
		new webpack.DefinePlugin({
			// invalid replacement code: the error must name this key
			"typeof PRODUCTION": "(( invalid syntax"
		})
	]
};
