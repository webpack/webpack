"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * A configuration whose module ids only the hashed module ids plugin assigns.
 * @param {string} name the config's name, which keeps its files apart
 * @param {Configuration} options more options
 * @param {ConstructorParameters<typeof webpack.ids.HashedModuleIdsPlugin>[0]=} pluginOptions the plugin's options
 * @returns {Configuration} configuration
 */
const hashedIds = (name, options, pluginOptions) => ({
	...options,
	output: { ...options.output, filename: `bundle-${name}.js` },
	optimization: { moduleIds: false },
	plugins: [
		new webpack.ids.HashedModuleIdsPlugin(pluginOptions),
		new webpack.DefinePlugin({ NAME: JSON.stringify(name) })
	]
});

/** @type {Configuration[]} */
module.exports = [
	// another compiler with other defaults does not change the ones that follow
	hashedIds("future", { experiments: { futureDefaults: true } }),
	hashedIds("default", {}),
	hashedIds("md4", {}, { hashFunction: "md4" }),
	hashedIds("output", { output: { hashFunction: "sha256" } }),
	hashedIds("sha256", {}, { hashFunction: "sha256" })
];
