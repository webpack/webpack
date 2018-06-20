"use strict";

const webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			DEFINE_PATH: JSON.stringify("./a")
		})
	]
};
