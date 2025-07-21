"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		library: {
			type: "commonjs"
		}
	},
	optimization: {
		minimize: false
	}
};
