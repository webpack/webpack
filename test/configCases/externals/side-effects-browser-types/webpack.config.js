"use strict";

const assertIncludedExternals = require("../../../helpers/assertIncludedExternals");

/** @import { Configuration } from "../../../../" */
/** @import { ExternalsType } from "../../../../declarations/WebpackOptions.js" */

// a `script` external is requested as `<global>@<url>`
const scriptRequest = (/** @type {string} */ name) =>
	`${name.replace(/-/g, "_")}@https://test.cases/path/${name}.js`;

/**
 * @param {string} type externals type
 * @param {(name: string) => string} request the external target for a name
 * @returns {Configuration} configuration
 */
const config = (type, request = (name) => name) => ({
	name: type,
	target: "web",
	entry: `./${type}.js`,
	output: { uniqueName: type },
	optimization: {
		minimize: false,
		// the assertion below reads chunk membership, which concatenating an
		// external into the entry would hide
		concatenateModules: false
	},
	externalsType: /** @type {ExternalsType} */ (type),
	externals: {
		[`${type}-free`]: {
			external: request(`${type}-free`),
			sideEffects: false
		},
		[`${type}-keep`]: request(`${type}-keep`)
	},
	plugins: [
		assertIncludedExternals({
			[`${type}-free`]: false,
			[`${type}-keep`]: true
		})
	]
});

/** @type {Configuration[]} */
module.exports = [
	config("window"),
	config("self"),
	config("script", scriptRequest)
];
