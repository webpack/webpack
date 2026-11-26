"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
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
	optimization: {
		minimize: true
	}
};
