"use strict";

const { pathToFileURL } = require("url");
const webpack = require("../../../../");

/**
 * A configuration hashing module ids against the context it is given.
 * @param {string} suffix keeping the emitted files of each config apart
 * @param {string} context the plugin's `context` option
 * @returns {import("../../../../").Configuration} configuration
 */
const hashedIds = (suffix, context) => ({
	output: {
		filename: `[name]-${suffix}.js`
	},
	optimization: {
		// Only the plugin may assign ids, so the context it hashes is observable
		moduleIds: false
	},
	plugins: [new webpack.ids.HashedModuleIdsPlugin({ context })]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	hashedIds("path", __dirname),
	hashedIds("url", pathToFileURL(__dirname).href)
];
