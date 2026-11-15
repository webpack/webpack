"use strict";

const path = require("path");

/** @typedef {{ context: string, output: { path: string, filename: string } }} BundleOptions */

module.exports = {
	skipFreshAssetContent:
		"Retained code generation metadata can change bytes; compare runtime exports with the fresh build and expected values instead.",
	/**
	 * @param {number} _index configuration index
	 * @param {BundleOptions} options compiler options
	 * @returns {string} assertions for this step
	 */
	findBundle: (_index, options) => path.join(options.context, "test.js"),
	/**
	 * @param {{ FRESH_OUTPUT_DIRECTORY: string, BUNDLE_PATH?: string, FRESH_BUNDLE_PATH?: string }} scope test scope
	 * @param {BundleOptions} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.BUNDLE_PATH = path.join(options.output.path, options.output.filename);
		scope.FRESH_BUNDLE_PATH = path.join(
			scope.FRESH_OUTPUT_DIRECTORY,
			options.output.filename
		);
	}
};
