"use strict";

/**
 * @param {string} entry the entry module
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (entry) => ({
	entry,
	mode: "development",
	devtool: false,
	experiments: {
		deferImport: true
	},
	optimization: {
		sideEffects: true,
		concatenateModules: false
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config("./index.js"), config("./early.js")];
