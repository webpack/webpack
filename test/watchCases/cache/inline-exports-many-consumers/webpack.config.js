"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "filesystem"
	},
	optimization: {
		minimize: false,
		inlineExports: true
	}
};
