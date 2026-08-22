"use strict";

/** @import { Compilation, Compiler } from "../../../../" */
/** @import { Configuration } from "../../../../types" */

const STRING_NAMES = [
	"str name",
	"re str",
	"ns name",
	"deep str",
	"foo bar",
	"foo-bar"
];

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
			// Redeclaring a generated binding is a syntax error
			const declared = (
				source.match(/\bconst __webpack_exports__\w+/g) || []
			).map((declaration) => declaration.slice("const ".length));
			expect(declared).toHaveLength(new Set(declared).size);
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
