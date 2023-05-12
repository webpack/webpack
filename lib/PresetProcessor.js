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
	 * @param {WebpackOptions} options options object
	 * @returns {WebpackOptions} options object with presets applied
	 */
	process(options) {
		if (!options.presets) return options;
		if (options.presets.length === 0) return options;
		return webpackMerge.merge([...options.presets, options]);
	}
}

module.exports = PresetProcessor;
