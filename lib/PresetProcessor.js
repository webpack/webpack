/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
*/

"use strict";

const webpackMerge = require("webpack-merge");

/** @typedef {import("../declarations/WebpackOptions").Presets} Presets */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */

/**
 * Processor that reads the preset property from the webpack configuration and
 * merges the preset configuration into the webpack configuration.
 */
class PresetProcessor {
	/**
	 * @param {WebpackOptions} webpackConfig options object
	 * @returns {WebpackOptions} webpackConfig object with presets merged into config
	 */
	recursivelyMergePresets(webpackConfig) {
		if (!webpackConfig.presets) return webpackConfig;
		if (webpackConfig.presets.length === 0) return webpackConfig;
		return webpackMerge.merge([
			...webpackConfig.presets.map(preset =>
				this.recursivelyMergePresets(preset)
			),
			webpackConfig
		]);
	}

	/**
	 * @param {WebpackOptions} webpackConfig options object
	 * @returns {WebpackOptions} options object with presets merged into config
	 */
	process(webpackConfig) {
		return this.recursivelyMergePresets(webpackConfig);
	}
}

module.exports = PresetProcessor;
