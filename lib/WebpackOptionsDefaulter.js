/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { applyWebpackOptionsDefaults } = require("./config/defaults");
const { getNormalizedWebpackOptions } = require("./config/normalization");

/**
 * @import {
 * 	WebpackOptions,
 * 	WebpackOptionsNormalized
 * } from "../declarations/WebpackOptions"
 */

class WebpackOptionsDefaulter {
	/**
	 * Returns normalized webpack options.
	 * @param {WebpackOptions} options webpack options
	 * @returns {WebpackOptionsNormalized} normalized webpack options
	 */
	process(options) {
		const normalizedOptions = getNormalizedWebpackOptions(options);
		applyWebpackOptionsDefaults(normalizedOptions);
		return normalizedOptions;
	}
}

module.exports = WebpackOptionsDefaulter;
