/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UncacheableModulesWarning extends WebpackError {
	/**
	 * Creates an instance of UncacheableModulesWarning.
	 * @param {number} count how many modules are not cacheable
	 * @param {string[]} reasons the reasons, most frequent first
	 */
	constructor(count, reasons) {
		super(
			`module caching: ${count} ${
				count === 1 ? "module is" : "modules are"
			} not cacheable, so ${
				count === 1 ? "it is" : "they are"
			} rebuilt on every build even when the cache is warm: ${reasons.join(
				", "
			)}.\nA loader calling 'this.cacheable(false)', or a value that changes every build, forces this. Stats list the modules individually as '[not cacheable]'.\nFor more info visit https://webpack.js.org/configuration/cache/`
		);

		/** @type {string} */
		this.name = "UncacheableModulesWarning";
	}
}

module.exports = UncacheableModulesWarning;
