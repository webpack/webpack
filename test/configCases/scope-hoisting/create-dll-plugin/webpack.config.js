"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: ["./index.js"],
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/scope-hoisting/create-dll-plugin/manifest.json"
			)
		}),
		new webpack.optimize.ModuleConcatenationPlugin()
	]
};
