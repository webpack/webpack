"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		module: true,
		library: { type: "module" }
	},
	optimization: { minimize: false },
	cache: {
		type: "filesystem"
	}
};
