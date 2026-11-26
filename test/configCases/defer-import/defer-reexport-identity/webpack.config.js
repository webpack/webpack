"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	mode: "production",
	optimization: {
		concatenateModules: true,
		usedExports: true,
		sideEffects: true,
		minimize: false
	},
	experiments: {
		deferImport: true
	}
};
