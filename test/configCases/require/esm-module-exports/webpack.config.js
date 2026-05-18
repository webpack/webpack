"use strict";

const path = require("path");
const webpack = require("../../../..");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		parser: {
			javascript: {
				commonjsMagicComments: true
			}
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			VALUE_MJS_PATH: JSON.stringify(path.resolve(__dirname, "value.mjs")),
			PLAIN_MJS_PATH: JSON.stringify(path.resolve(__dirname, "plain.mjs")),
			NO_SPECIAL_MJS_PATH: JSON.stringify(
				path.resolve(__dirname, "no-special-export.mjs")
			),
			WITH_DEFAULT_MJS_PATH: JSON.stringify(
				path.resolve(__dirname, "with-default.mjs")
			),
			REEXPORT_MJS_PATH: JSON.stringify(path.resolve(__dirname, "reexport.mjs"))
		})
	]
};
