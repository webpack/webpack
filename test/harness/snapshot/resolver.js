"use strict";

const path = require("path");

/**
 * Maps per-case snapshot file names to their corresponding test files.
 * @type {Record<string, string>}
 */
const suiteNameToTestFile = {
	ConfigTest: path.resolve(__dirname, "../../ConfigTestCases.basictest.js")
};

const SNAPSHOT_EXTENSION = ".snap";

module.exports = {
	// Example test path, used for preflight consistency check of the implementation above
	testPathForConsistencyCheck: "some/__tests__/example.test.js",

	/**
	 * Resolves from test to snapshot path
	 * @param {string} testPath The test file path
	 * @param {string} snapshotExtension The snapshot extension
	 * @returns {string} The snapshot file path
	 */
	resolveSnapshotPath(testPath, snapshotExtension = SNAPSHOT_EXTENSION) {
		return path.join(
			path.dirname(testPath),
			"__snapshots__",
			path.basename(testPath) + snapshotExtension
		);
	},

	/**
	 * Resolves from snapshot to test path
	 * @param {string} snapshotPath The snapshot file path
	 * @param {string} snapshotExtension The snapshot extension
	 * @returns {string} The test file path
	 */
	resolveTestPath(snapshotPath, snapshotExtension = SNAPSHOT_EXTENSION) {
		const basename = path.basename(snapshotPath, snapshotExtension);

		// Check if this is a per-case snapshot (e.g., StatsTest.snap, ConfigTest.snap)
		if (suiteNameToTestFile[basename]) {
			return suiteNameToTestFile[basename];
		}

		// Default behavior: remove __snapshots__ dir and .snap extension
		return path.join(path.dirname(path.dirname(snapshotPath)), basename);
	}
};
