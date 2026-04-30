"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	output: {
		library: {
			type: "commonjs2"
		}
	},
	optimization: {
		minimize: false
	}
};
