"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	entry: {
		main: {
			import: "./index.js",
			dependOn: "foo"
		},
		foo: {
			import: "./foo.js"
		}
	},
	output: {
		clean: true,
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		library: {
			type: "module"
		}
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: true
	}
};
