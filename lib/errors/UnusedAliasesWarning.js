/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnusedAliasesWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedAliasesWarning.
	 * @param {string[]} names the alias names no request matched
	 */
	constructor(names) {
		super(
			`webpack alias recommendations: \nThe following 'resolve.alias' ${
				names.length === 1 ? "entry was" : "entries were"
			} never applied to a request: ${names.join(
				", "
			)}.\nAn alias nothing matches is usually a typo in the name, or a leftover from a package that is now imported directly. Note that an alias is matched against the request as written, so renaming the request without renaming the alias leaves the alias dead and the original request resolved as-is.\nFor more info visit https://webpack.js.org/configuration/resolve/#resolvealias`
		);

		/** @type {string} */
		this.name = "UnusedAliasesWarning";
	}
}

module.exports = UnusedAliasesWarning;
