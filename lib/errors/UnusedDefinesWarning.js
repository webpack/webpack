/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnusedDefinesWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedDefinesWarning.
	 * @param {string[]} keys the define keys nothing referenced
	 */
	constructor(keys) {
		super(
			`webpack define recommendations: \nThe following ${
				keys.length === 1 ? "key was" : "keys were"
			} defined but never referenced by any module: ${keys.join(
				", "
			)}.\nA key that substitutes nothing is usually a typo, or a leftover from code that no longer reads it. Every key still costs a parser hook on each module, and changing its value invalidates the build for nothing.\nFor more info visit https://webpack.js.org/plugins/define-plugin/`
		);

		/** @type {string} */
		this.name = "UnusedDefinesWarning";
	}
}

module.exports = UnusedDefinesWarning;
