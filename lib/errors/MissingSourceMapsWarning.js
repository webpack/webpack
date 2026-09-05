/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} MissingSourceMapDetails
 * @property {string} name the module, by request
 * @property {string[]} loaders the loaders that ran on it
 */

class MissingSourceMapsWarning extends WebpackError {
	/**
	 * Creates an instance of MissingSourceMapsWarning.
	 * @param {MissingSourceMapDetails[]} modules the modules whose map was lost
	 * @param {number} total how many such modules there are
	 */
	constructor(modules, total) {
		const list = modules
			.map((it) => `\n  ${it.name} (${it.loaders.join(", ")})`)
			.join("");

		super(
			`missing source maps: ${total} ${total === 1 ? "module was" : "modules were"} transformed by a loader that returned no source map:${list}\nA loader that rewrites code without returning a map leaves webpack mapping positions to the loader's output as though it were the file on disk, so every line the map names below that point is likely to be wrong. Have the loader pass its map to 'this.callback(null, code, map)', or take the loader out of the chain for this build.\nFor more info visit https://webpack.js.org/api/loaders/#thiscallback`
		);

		/** @type {string} */
		this.name = "MissingSourceMapsWarning";
	}
}

module.exports = MissingSourceMapsWarning;
