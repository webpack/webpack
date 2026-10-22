"use strict";

const path = require("path");

module.exports = {
	/**
	 * @param {number} i index of the build
	 * @param {import("../../../../").Configuration} options options of the build
	 * @returns {string} the bundle, which each build emits to a directory of its own
	 */
	findBundle(i, options) {
		const output = /** @type {{ path: string }} */ (options.output);
		return path.join(output.path, `bundle${i}.js`);
	}
};
