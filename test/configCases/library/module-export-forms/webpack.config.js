"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../types").Configuration} Configuration */

/** Export names each emitted bundle must still expose. */
const EXPECTED_EXPORTS = {
	forms: ["renamed", "another", "as default"],
	"alias-default": ["keep", "as default"],
	"reexport-default": ["keep", "as default"],
	"named-as-default": ["keep", "as default"]
};

/**
 * @this {Compiler}
 * @returns {void}
 */
function expectExportNames() {
	/**
	 * @param {Compilation} compilation compilation
	 */
	const handler = (compilation) => {
		compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
			for (const [assetName, asset] of Object.entries(assets)) {
				const entry =
					/** @type {keyof EXPECTED_EXPORTS} */
					(assetName.replace(/(-no-concat)?\.mjs$/, ""));
				const source = asset.source().toString();
				for (const exportName of EXPECTED_EXPORTS[entry]) {
					expect(source).toContain(exportName);
				}
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
	entry: {
		forms: "./index.js",
		"alias-default": "./alias-default.js",
		"reexport-default": "./reexport-default.js",
		"named-as-default": "./named-as-default.js"
	},
	output: {
		module: true,
		filename: concatenateModules ? "[name].mjs" : "[name]-no-concat.mjs",
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	optimization: { minimize: false, concatenateModules },
	plugins: [expectExportNames]
});

/** @type {Configuration[]} */
module.exports = [
	createConfig("concat", true),
	createConfig("no-concat", false)
];
