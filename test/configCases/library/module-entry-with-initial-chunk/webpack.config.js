"use strict";

/** @import { Compiler, Configuration } from "../../../../" */

/**
 * Asserts the emitted entry still exposes both of its bindings, which the
 * definitions put back into the factory are what define.
 * @param {string} assetName emitted entry asset to assert on
 * @returns {(this: Compiler) => void} plugin
 */
const assertExportNames = (assetName) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source().toString();
				expect(source).toContain("as default");
				expect(source).toContain("as keep");
			});
		});
	};

/**
 * The split chunk loads with the entry, so the entry is executed as a factory
 * rather than inlined into the startup, and the export definitions it left out
 * on demand are put back there — the helpers they read have to stay.
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {Configuration} configuration
 */
const createConfig = (name, concatenateModules) => ({
	mode: "production",
	name,
	entry: { [name]: "./index.js" },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFormat: "module",
		library: {
			type: "module"
		}
	},
	optimization: {
		minimize: false,
		concatenateModules,
		splitChunks: {
			cacheGroups: {
				side: {
					test: /side\.js$/,
					chunks: "all",
					name: "side",
					enforce: true
				}
			}
		}
	},
	plugins: [assertExportNames(`${name}.mjs`)]
});

/** @type {Configuration[]} */
module.exports = [
	createConfig("concat", true),
	createConfig("no-concat", false)
];
