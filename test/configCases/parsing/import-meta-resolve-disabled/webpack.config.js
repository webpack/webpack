"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	},
	optimization: {
		minimize: false
	},
	module: {
		parser: {
			javascript: {
				importMeta: {
					resolve: false
				}
			}
		}
	}
};
