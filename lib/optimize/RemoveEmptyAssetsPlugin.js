/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */

class RemoveEmptyAssetsPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveEmptyAssetsPlugin", compilation => {
			compilation.hooks.afterProcessAssets.tap(
				"RemoveEmptyAssetsPlugin",
				assets => {
					Object.entries(assets).forEach(([assetName, asset]) => {
						if (asset.size()) return;

						compilation.deleteAsset(assetName);
					});
				}
			);
		});
	}
}

module.exports = RemoveEmptyAssetsPlugin;
