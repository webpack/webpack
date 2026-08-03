"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../types").Configuration} Configuration */

const STRING_NAMES = ["str name", "re str", "ns name", "deep str"];

/**
 * @this {Compiler}
 * @returns {void}
 */
function expectQuotedExportNames() {
	/**
	 * @param {Compilation} compilation compilation
	 */
	const handler = (compilation) => {
		compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
			const name =
				/** @type {string} */
				(Object.keys(assets).find((assetName) => assetName.endsWith(".mjs")));
			const source = assets[name].source().toString();
			for (const stringName of STRING_NAMES) {
				expect(source).toContain(`as "${stringName}"`);
				// The unquoted form is a syntax error
				expect(source).not.toContain(`as ${stringName}`);
			}
		});
	};
	this.hooks.compilation.tap("testcase", handler);
}

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {Configuration} configuration
 */
const createConfig = (name, concatenateModules) => ({
	mode: "production",
	name,
	output: {
		module: true,
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	optimization: { minimize: false, concatenateModules },
	plugins: [expectQuotedExportNames]
});

/** @type {Configuration[]} */
module.exports = [
	createConfig("concat", true),
	createConfig("no-concat", false)
];
