/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
*/

"use strict";

const { mergeWithCustomize, mergeWithRules } = require("webpack-merge");

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
	static recursivelyMergePresets(webpackConfig) {
		if (!webpackConfig.presets) return webpackConfig;
		if (webpackConfig.presets.length === 0) return webpackConfig;

		const mergeFunction = mergeWithCustomize({
			customizeObject(a, b, key) {
				if (key === "module") {
					return mergeWithRules({
						rules: {
							test: "match",
							use: {
								loader: "match",
								options: "merge"
							},
							include: "match",
							exclude: "match"
						}
					})(a, b);
				}
				return undefined;
			}
		});

		return mergeFunction([
			...webpackConfig.presets.map(preset =>
				this.recursivelyMergePresets(preset)
			),
			webpackConfig
		]);
	}
}

module.exports = PresetProcessor;
