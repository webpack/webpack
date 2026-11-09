/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnsafeOutputCleanWarning extends WebpackError {
	/**
	 * Creates an instance of UnsafeOutputCleanWarning.
	 * @param {string} outputPath the output path
	 * @param {string} directory the project directory the output path contains
	 */
	constructor(outputPath, directory) {
		super(
			`'output.clean' did not clean '${outputPath}': it contains '${directory}', so cleaning would remove the project's own files.\nSet 'output.path' to a directory of its own, such as 'dist', or list the files to keep in 'output.clean.keep'.`
		);

		/** @type {string} */
		this.name = "UnsafeOutputCleanWarning";
	}
}

module.exports = UnsafeOutputCleanWarning;
