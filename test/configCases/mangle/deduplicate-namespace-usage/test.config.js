"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string[]} entry bundles
	 */
	findBundle(index) {
		return ["first", "second", "mixed", "dependent"].map(
			(name) => `./${name}.${index}.js`
		);
	}
};
