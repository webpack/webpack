"use strict";

const assertIncludedExternals = require("../../../helpers/assertIncludedExternals");

/** @import { Configuration } from "../../../../" */
/** @import { LibraryType, ExternalsType } from "../../../../declarations/WebpackOptions.js" */

/**
 * @param {string} type externals type
 * @param {string} libraryType matching library type
 * @param {string=} libraryName library name, when the library type needs one
 * @returns {Configuration} configuration
 */
const config = (type, libraryType, libraryName) => ({
	name: type,
	target: "web",
	entry: `./${type}.js`,
	output: {
		library: {
			type: /** @type {LibraryType} */ (libraryType),
			name: libraryName
		},
		uniqueName: type
	},
	optimization: {
		minimize: false,
		// the assertion below reads chunk membership, which concatenating an
		// external into the entry would hide
		concatenateModules: false
	},
	externalsType: /** @type {ExternalsType} */ (type),
	externals: {
		[`${type}-free`]: { external: `${type}-free`, sideEffects: false },
		[`${type}-keep`]: `${type}-keep`
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
	config("amd", "amd"),
	config("amd-require", "amd"),
	config("amd-async", "amd"),
	config("umd", "umd"),
	config("umd2", "umd2"),
	config("system", "system"),
	config("jsonp", "jsonp", "jsonpCallback")
];
