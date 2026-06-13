"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "electron-main",
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		module: true,
		filename: "[name].js"
	},
	entry: {
		externals: "./externals",
		main: "./index"
	},
	optimization: {
		concatenateModules: false,
		minimize: false
	},
	experiments: {
		outputModule: true
	},
	externals: {
		fs: "commonjs fs",
		path: "commonjs path"
	}
};
