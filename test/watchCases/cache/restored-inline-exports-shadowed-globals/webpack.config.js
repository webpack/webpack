"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: {
		inlineExports: true,
		minimize: false
	}
};
