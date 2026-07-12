"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		libraryTarget: "commonjs2"
	},
	externals: {
		external: ["webpack", "version"]
	}
};
