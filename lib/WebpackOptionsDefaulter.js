/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { applyWebpackOptionsDefaults } from "./config/defaults.js";
import { getNormalizedWebpackOptions } from "./config/normalization.js";
/** @typedef {import("./config/normalization.js").WebpackOptions} WebpackOptions */
/** @typedef {import("./config/normalization.js").WebpackOptionsNormalized} WebpackOptionsNormalized */

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

export default WebpackOptionsDefaulter;

export { WebpackOptionsDefaulter as "module.exports" };
