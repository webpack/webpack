/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class AssetOutsideOutputPathWarning extends WebpackError {
	/**
	 * Warns about an asset written outside of `output.path` while `output.allowOutside` is unset.
	 * @param {string} file the asset name
	 * @param {string} outputPath the output path
	 */
	constructor(file, outputPath) {
		super(
			`Asset ${JSON.stringify(file)} is written outside of output.path (${outputPath}). ` +
				"This becomes an error with experiments.futureDefaults and in the next major version. " +
				"Use a name relative to output.path without '..' segments, change output.path, or allow the directory with output.allowOutside."
		);

		/** @type {string} */
		this.name = "AssetOutsideOutputPathWarning";
		/** @type {string} */
		this.file = file;
	}
}

module.exports = AssetOutsideOutputPathWarning;
