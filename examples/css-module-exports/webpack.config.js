"use strict";

const path = require("path");

/** @typedef {import("webpack").Compiler} Compiler */

/**
 * Emits the CSS Modules name map (original class/id name -> generated scoped
 * name) as a JSON sidecar per CSS module — the native-CSS equivalent of the
 * postcss-modules `getJSON` callback. The map is computed during code
 * generation and stored on `module.buildInfo.cssData.exports` (a
 * `Map<string, string>`), the same source webpack uses to build the JS exports.
 */
class CssModuleExportsJsonPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		const { Compilation } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			"CssModuleExportsJsonPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "CssModuleExportsJsonPlugin",
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const module of compilation.modules) {
							const cssData =
								/** @type {{ exports?: Map<string, string> }=} */
								(module.buildInfo && module.buildInfo.cssData);
							if (!cssData || !cssData.exports || cssData.exports.size === 0) {
								continue;
							}
							const { resource } =
								/** @type {import("webpack").NormalModule} */ (module);
							const json = Object.fromEntries(cssData.exports);
							compilation.emitAsset(
								`${path.basename(resource)}.json`,
								new RawSource(`${JSON.stringify(json, null, 2)}\n`)
							);
						}
					}
				);
			}
		);
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		css: true
	},
	plugins: [new CssModuleExportsJsonPlugin()]
};

module.exports = config;
