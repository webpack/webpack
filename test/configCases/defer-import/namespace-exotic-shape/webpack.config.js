"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	mode: "development",
	optimization: {
		concatenateModules: false,
		minimize: false
	},
	experiments: {
		deferImport: true
	}
};
