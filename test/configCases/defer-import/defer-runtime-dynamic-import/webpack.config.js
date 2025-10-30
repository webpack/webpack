"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	entry: ["../defer-runtime/all-dynamic-import.js"],
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: true
	}
};
