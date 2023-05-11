/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
*/

"use strict";

const webpackMerge = require("webpack-merge");

/** @typedef {import("../declarations/WebpackOptions").Presets} Presets */
/** @typedef {import("./Compiler")} Compiler */

/**
 * Plugin that reads the preset property from the webpack configuration and
 * merges the preset configuration into the webpack configuration.
 */
class PresetPlugin {
	/**
	 * @param {Presets} presets presets to be applied
	 */
	constructor(presets) {
		this.presets = presets;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.beforeRun.tap("PresetPlugin", compiler => {
			const configs = this.presets.map(preset => {
				if (typeof preset === "string") {
					return require(preset);
				}
			});

			compiler.options = webpackMerge.merge(compiler.options, ...configs);
		});
	}
}

module.exports = PresetPlugin;
