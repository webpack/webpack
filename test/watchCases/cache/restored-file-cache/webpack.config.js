"use strict";

/** @type {import("../../../..").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	cache: { type: "filesystem" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" }
};
