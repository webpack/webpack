"use strict";

const path = require("path");
const webpack = require("../../../..");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	// Enable used-exports tracking so the chicken-and-egg path between
	// `getReferencedExports` and the unwrap helper is exercised — the
	// regression this would catch is webpack falling back to `.named` for
	// `require(esm).named` when `"module.exports"` hasn't been marked used yet.
	optimization: {
		usedExports: true
	},
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
			REEXPORT_MJS_PATH: JSON.stringify(
				path.resolve(__dirname, "reexport.mjs")
			),
			WRAPPER_FULL_PATH: JSON.stringify(
				path.resolve(__dirname, "wrapper-full.cjs")
			),
			WRAPPER_NAMED_PATH: JSON.stringify(
				path.resolve(__dirname, "wrapper-named.cjs")
			),
			WRAPPER_PROP_PATH: JSON.stringify(
				path.resolve(__dirname, "wrapper-prop.cjs")
			),
			DISTINCT_MJS_PATH: JSON.stringify(path.resolve(__dirname, "distinct.mjs"))
		})
	]
};
