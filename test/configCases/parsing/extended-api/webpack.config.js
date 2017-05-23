"use strict";
const webpack = require("../../../../");

module.exports = {
	entry: {
		other: "./index"
	},
	plugins: [
		new webpack.ExtendedAPIPlugin()
	]
};
