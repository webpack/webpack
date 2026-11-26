"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	plugins: [
		new webpack.DefinePlugin({
			PROPERTY: JSON.stringify("foo")
		})
	]
};
