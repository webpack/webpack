"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
