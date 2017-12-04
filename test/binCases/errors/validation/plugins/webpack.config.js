"use strict";

const path = require("path");
const webpack = require("../../../../../lib/webpack");

module.exports = {
	entry: path.resolve(__dirname, "./index"),
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			foo: "bar"
		})
	]
};
