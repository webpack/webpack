"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: "./a.js",
	output: {
		module: true,
		filename: "lib.js",
		library: {
			type: "module"
		}
	},
	target: "node14",
	optimization: {
		minimize: true
	}
};
