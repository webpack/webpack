"use strict";

/** @type {(concatenateModules: boolean) => import("../../../../").Configuration} */
const config = (concatenateModules) => ({
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	optimization: {
		concatenateModules
	},
	experiments: {
		deferImport: true
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
