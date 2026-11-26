"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new webpack.WatchIgnorePlugin({
			paths: [/file\.js$/, /foo$/, "glob-ignored.js"]
		})
	]
};
