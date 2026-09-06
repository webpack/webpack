/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class EmptyCopyPatternWarning extends WebpackError {
	/**
	 * Creates an instance of EmptyCopyPatternWarning.
	 * @param {string} from the `from` of the pattern as written in the configuration
	 * @param {string} glob the glob `from` was resolved to
	 */
	constructor(from, glob) {
		super(
			`The '${from}' pattern of 'output.copy' copied no file.\nIt resolved to '${glob}', which matches nothing on disk — usually a typo, a path relative to the wrong directory, or a directory a previous build step was supposed to create.\nSilence it with 'ignoreWarnings' when the pattern is optional.`
		);

		/** @type {string} */
		this.name = "EmptyCopyPatternWarning";
	}
}

module.exports = EmptyCopyPatternWarning;
