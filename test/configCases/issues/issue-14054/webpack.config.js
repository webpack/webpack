"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: true
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
