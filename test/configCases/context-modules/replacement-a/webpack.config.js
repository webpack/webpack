"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(
			/replacement.a$/,
			"new-context",
			true,
			/^replaced$/
		)
	]
};
