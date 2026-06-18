/*
	MIT License http://www.opensource.org/licenses/mit-license.php

	Author Natsu @xiaoxiaojx
*/

"use strict";

const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");

/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */

/**
 * @param {Record<string, EXPECTED_ANY> | null | undefined} importOptions magic comment options
 * @param {(warning: Error) => void} addWarning addWarning callback
 * @param {DependencyLocation} loc source location
 * @returns {EntryOptions | undefined} parsed entry options
 */
const parseWebpackEntryOptions = (importOptions, addWarning, loc) => {
	if (!importOptions) return undefined;

	/** @type {EntryOptions} */
	const entryOptions = {};
	let hasOptions = false;

	if (importOptions.webpackEntryOptions !== undefined) {
		if (
			typeof importOptions.webpackEntryOptions !== "object" ||
			importOptions.webpackEntryOptions === null
		) {
			addWarning(
				new UnsupportedFeatureWarning(
					`\`webpackEntryOptions\` expected a object, but received: ${importOptions.webpackEntryOptions}.`,
					loc
				)
			);
		} else {
			const userEntryOptions = importOptions.webpackEntryOptions;
			for (const key of Object.keys(userEntryOptions)) {
				if (
					key === "__proto__" ||
					key === "constructor" ||
					key === "prototype"
				) {
					continue;
				}
				/** @type {EXPECTED_ANY} */
				(entryOptions)[key] = /** @type {EXPECTED_ANY} */ (userEntryOptions)[
					key
				];
				hasOptions = true;
			}
		}
	}

	if (importOptions.webpackChunkName !== undefined) {
		if (typeof importOptions.webpackChunkName !== "string") {
			addWarning(
				new UnsupportedFeatureWarning(
					`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`,
					loc
				)
			);
		} else {
			entryOptions.name = importOptions.webpackChunkName;
			hasOptions = true;
		}
	}

	return hasOptions ? entryOptions : undefined;
};

module.exports = parseWebpackEntryOptions;
