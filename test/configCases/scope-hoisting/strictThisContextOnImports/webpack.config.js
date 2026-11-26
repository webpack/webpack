"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		strictThisContextOnImports: true
	},
	plugins: [new webpack.optimize.ModuleConcatenationPlugin()]
};
