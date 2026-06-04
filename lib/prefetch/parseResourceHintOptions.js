/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");

/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */

/**
 * @typedef {object} ResourceHintOptions
 * @property {true=} prefetch
 * @property {true=} preload
 * @property {("high" | "low" | "auto")=} fetchPriority
 * @property {string=} as
 * @property {string=} type
 * @property {string=} media
 */

/**
 * Reads `webpackPrefetch` / `webpackPreload` / `webpackFetchPriority` /
 * `webpackAs` / `webpackType` / `webpackMedia` from a parsed magic-comment
 * options object. Invalid values emit warnings to the given module.
 * @param {Record<string, EXPECTED_ANY> | null | undefined} importOptions parsed comment options
 * @param {NormalModule} module the module to attach warnings to
 * @param {DependencyLocation} loc location for warnings
 * @returns {ResourceHintOptions} parsed hints (empty when no comments matched)
 */
const parseResourceHintOptions = (importOptions, module, loc) => {
	/** @type {ResourceHintOptions} */
	const hints = {};
	if (!importOptions) return hints;

	/**
	 * @param {string} message warning text
	 * @returns {void}
	 */
	const warn = (message) => {
		module.addWarning(new UnsupportedFeatureWarning(message, loc));
	};

	if (importOptions.webpackPrefetch !== undefined) {
		if (importOptions.webpackPrefetch === true) {
			hints.prefetch = true;
		} else {
			warn(
				`\`webpackPrefetch\` expected true, but received: ${importOptions.webpackPrefetch}.`
			);
		}
	}
	if (importOptions.webpackPreload !== undefined) {
		if (importOptions.webpackPreload === true) {
			hints.preload = true;
		} else {
			warn(
				`\`webpackPreload\` expected true, but received: ${importOptions.webpackPreload}.`
			);
		}
	}
	if (importOptions.webpackFetchPriority !== undefined) {
		const fp = importOptions.webpackFetchPriority;
		if (fp === "high" || fp === "low" || fp === "auto") {
			hints.fetchPriority = fp;
		} else {
			warn(
				`\`webpackFetchPriority\` expected "low", "high" or "auto", but received: ${fp}.`
			);
		}
	}
	if (importOptions.webpackAs !== undefined) {
		if (typeof importOptions.webpackAs === "string") {
			hints.as = importOptions.webpackAs;
		} else {
			warn(
				`\`webpackAs\` expected a string, but received: ${importOptions.webpackAs}.`
			);
		}
	}
	if (importOptions.webpackType !== undefined) {
		if (typeof importOptions.webpackType === "string") {
			hints.type = importOptions.webpackType;
		} else {
			warn(
				`\`webpackType\` expected a string, but received: ${importOptions.webpackType}.`
			);
		}
	}
	if (importOptions.webpackMedia !== undefined) {
		if (typeof importOptions.webpackMedia === "string") {
			hints.media = importOptions.webpackMedia;
		} else {
			warn(
				`\`webpackMedia\` expected a string, but received: ${importOptions.webpackMedia}.`
			);
		}
	}

	return hints;
};

module.exports = parseResourceHintOptions;
