"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [
			{ test: /\.svg$/, issuer: /\.js$/, use: "raw-loader" }
		]
	}
};
