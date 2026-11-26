"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		moduleIds: "named"
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require("../../../js/config/dll-plugin-entry/manifest0.json"),
			name: "../0-create-dll/dll.js",
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
