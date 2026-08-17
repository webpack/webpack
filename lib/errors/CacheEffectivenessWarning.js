/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} CacheEffectiveness
 * @property {number} total how many modules the compilation holds
 * @property {number} rebuilt how many of them were built rather than reused
 * @property {number} uncacheable how many can never be reused
 * @property {string[]} reasons why they cannot, most frequent first
 */

class CacheEffectivenessWarning extends WebpackError {
	/**
	 * Creates an instance of CacheEffectivenessWarning.
	 * @param {CacheEffectiveness} effectiveness what the compilation reused
	 */
	constructor({ total, rebuilt, uncacheable, reasons }) {
		const lines = [];

		// Only stated when something was reused, which is what proves the cache was
		// warm — a cold build rebuilds everything by design.
		if (rebuilt < total) {
			lines.push(
				`${rebuilt} of ${total} modules were rebuilt although the cache was warm.`
			);
		}

		if (uncacheable > 0) {
			lines.push(
				`${uncacheable} ${
					uncacheable === 1 ? "module is" : "modules are"
				} not cacheable, so ${
					uncacheable === 1 ? "it rebuilds" : "they rebuild"
				} on every build: ${reasons.join(", ")}.`
			);
		}

		super(
			`module caching: ${lines.join(
				" "
			)}\nA loader calling 'this.cacheable(false)', or a value that changes every build, prevents reuse. Stats list the modules individually as '[not cacheable]'.\nFor more info visit https://webpack.js.org/configuration/cache/`
		);

		/** @type {string} */
		this.name = "CacheEffectivenessWarning";
	}
}

module.exports = CacheEffectivenessWarning;
