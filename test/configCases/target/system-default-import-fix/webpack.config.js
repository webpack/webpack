"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "system"
	},
	externals: {
		react: "react"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
