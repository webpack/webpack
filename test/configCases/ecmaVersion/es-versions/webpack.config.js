"use strict";

const VERSIONS = ["es5", "es2015", "es2017", "es2018", "es2020", "es2022"];

/**
 * @param {string} version an `esX` target
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (version) => ({
	name: version,
	target: ["web", version],
	entry: "./index.js",
	output: {
		filename: `${version}/bundle.js`,
		chunkFilename: `${version}/[name].js`
	},
	optimization: {
		chunkIds: "named"
	}
});

// Every rung of the `esX` ladder, so the middle ones are read too: a target with
// arrow functions but no optional chaining has to get one and not the other.
/** @type {import("../../../../").Configuration[]} */
module.exports = VERSIONS.map(variant);
