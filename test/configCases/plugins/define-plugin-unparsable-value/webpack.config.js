"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			// the value is code, so one that does not parse is reported under the
			// key that carries it rather than as a bare "Unexpected token"
			"typeof BROKEN": "this is ( not valid js"
		})
	]
};
