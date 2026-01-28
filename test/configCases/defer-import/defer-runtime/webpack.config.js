"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	entry: ["./all.js"],
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: true
	}
};
