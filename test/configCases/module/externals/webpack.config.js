"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		}
	},
	entry: {
		main: "./index.js",
		imported: {
			import: "./imported.js",
			library: {
				type: "module"
			}
		}
	},
	target: "node14",
	output: {
		module: true,
		filename: "[name].mjs"
	},
	externals: "./imported.mjs",
	optimization: {
		concatenateModules: true
	}
};
