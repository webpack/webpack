"use strict";

const webpack = require("../../../"); // Point to the root webpack

module.exports = {
	mode: "development",
	entry: "./index.js",
	plugins: [
		new webpack.DefinePlugin({
			// This invalid syntax will trigger your new try-catch logic
			BROKEN_VALUE: "(( invalid { syntax"
		})
	]
};
