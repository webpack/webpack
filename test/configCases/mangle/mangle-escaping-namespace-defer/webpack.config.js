"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {(concatenateModules: boolean) => Configuration} */
const config = (concatenateModules) => ({
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	optimization: {
		concatenateModules
	},
	experiments: {
		deferImport: true
	}
});

/** @type {Configuration[]} */
module.exports = [config(false), config(true)];
