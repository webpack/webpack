/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports = {
	/**
	 * @type {Record<string, string>}
	 */
	versions: {},
	/**
	 * @param {function} fn function
	 */
	nextTick(fn) {
		const args = Array.prototype.slice.call(arguments, 1);
		Promise.resolve().then(function () {
			fn.apply(null, args);
		});
	}
};
