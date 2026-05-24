"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	node: {
		global: true,
		__filename: false
	},
	optimization: {
		minimize: false,
		inlineExports: true
	}
};
