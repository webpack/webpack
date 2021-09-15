"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			DEFINE_PATH: JSON.stringify("./a")
		})
	]
};
