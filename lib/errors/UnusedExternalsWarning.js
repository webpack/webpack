/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnusedExternalsWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedExternalsWarning.
	 * @param {string[]} requests the external requests nothing imported
	 */
	constructor(requests) {
		super(
			`webpack externals recommendations: \nThe following ${
				requests.length === 1 ? "external was" : "externals were"
			} declared but never imported: ${requests.join(
				", "
			)}.\nAn external that nothing requests is usually a typo in the request, or a leftover from a dependency that is now bundled. It also hides a real import behind the wrong name, which then gets bundled instead of staying external.\nFor more info visit https://webpack.js.org/configuration/externals/`
		);

		/** @type {string} */
		this.name = "UnusedExternalsWarning";
	}
}

module.exports = UnusedExternalsWarning;
