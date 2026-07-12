/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "../errors/WebpackError.js";
import formatSize from "../util/formatSize.js";

class MinMaxSizeWarning extends WebpackError {
	/**
	 * Creates an instance of MinMaxSizeWarning.
	 * @param {string[] | undefined} keys keys
	 * @param {number} minSize minimum size
	 * @param {number} maxSize maximum size
	 */
	constructor(keys, minSize, maxSize) {
		let keysMessage = "Fallback cache group";
		if (keys) {
			keysMessage =
				keys.length > 1
					? `Cache groups ${keys.sort().join(", ")}`
					: `Cache group ${keys[0]}`;
		}
		super(
			"SplitChunksPlugin\n" +
				`${keysMessage}\n` +
				`Configured minSize (${formatSize(minSize)}) is ` +
				`bigger than maxSize (${formatSize(maxSize)}).\n` +
				"This seem to be a invalid optimization.splitChunks configuration."
		);
	}
}

export default MinMaxSizeWarning;

export { MinMaxSizeWarning as "module.exports" };
