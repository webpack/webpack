"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.ProvidePlugin({
			provided: [require.resolve("./provided"), "value"]
		})
	],
	optimization: {
		minimize: false
	}
};
