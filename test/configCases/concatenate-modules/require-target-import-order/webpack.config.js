"use strict";

/**
 * @param {string} name the entry name
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (name) => ({
	name,
	entry: `./${name}.js`,
	output: { filename: `${name}.js` },
	mode: "production",
	devtool: false,
	experiments: { deferImport: true },
	optimization: { concatenateModules: true, minimize: false }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config("deferred"), config("nested")];
