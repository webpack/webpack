/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class AssetOutsideOutputPathError extends WebpackError {
	/**
	 * Reports an asset whose name resolves outside of `output.path`, which is not emitted.
	 * @param {string} file the asset name
	 * @param {string} outputPath the output path
	 */
	constructor(file, outputPath) {
		super(
			`Asset ${JSON.stringify(file)} is not emitted because it would be written outside of output.path (${outputPath}). ` +
				"Use a name relative to output.path without '..' segments, or change output.path."
		);

		/** @type {string} */
		this.name = "AssetOutsideOutputPathError";
		/** @type {string} */
		this.file = file;
	}
}

module.exports = AssetOutsideOutputPathError;
