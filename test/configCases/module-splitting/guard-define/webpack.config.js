"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: false, concatenateModules: false },
	plugins: [
		new webpack.DefinePlugin({
			DEFINED_FLAG: JSON.stringify("DEFINE_GUARD_PAYLOAD")
		})
	]
};
