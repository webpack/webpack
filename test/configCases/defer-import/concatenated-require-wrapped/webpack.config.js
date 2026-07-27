"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	experiments: {
		deferImport: true
	},
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	stats: {
		optimizationBailout: true
	}
};
