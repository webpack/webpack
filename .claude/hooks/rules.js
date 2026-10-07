"use strict";

/**
 * What `stop-lint.js` decides, kept free of I/O so a unit test can state it.
 */

/**
 * Picks the edited files the Stop hook should lint: inside the repo, still
 * present, and named once.
 * @param {string[]} relativePaths every recorded edit, relative to the repo root
 * @param {(relativePath: string) => boolean} exists whether a path is still a file
 * @returns {string[]} the paths to check, in first-edit order
 */
const selectEditedFiles = (relativePaths, exists) => {
	const seen = new Set();
	const selected = [];
	for (const relativePath of relativePaths) {
		if (
			relativePath === "" ||
			relativePath.startsWith("../") ||
			relativePath === ".." ||
			seen.has(relativePath) ||
			!exists(relativePath)
		) {
			continue;
		}
		seen.add(relativePath);
		selected.push(relativePath);
	}
	return selected;
};

/**
 * @param {string[]} relativePaths the edited files
 * @returns {boolean} whether `types.d.ts` may have gone stale
 */
const touchesDeclaredTypes = (relativePaths) =>
	relativePaths.some(
		(relativePath) =>
			/^lib\/.*\.js$/.test(relativePath) ||
			relativePath.startsWith("declarations/")
	);

module.exports = {
	selectEditedFiles,
	touchesDeclaredTypes
};
