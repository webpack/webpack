"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: true
	}
};
