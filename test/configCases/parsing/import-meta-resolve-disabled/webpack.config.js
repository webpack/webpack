"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
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
