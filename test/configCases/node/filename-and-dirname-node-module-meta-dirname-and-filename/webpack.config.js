"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		module: true,
		importMetaName: "custom",
		environment: {
			importMetaDirnameAndFilename: true
		}
	},
	node: {
		__filename: "node-module",
		__dirname: "node-module"
	}
};
