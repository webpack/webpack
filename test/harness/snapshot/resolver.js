"use strict";

const path = require("path");
const { partFileOf } = require("../../helpers/configCaseParts");

/**
 * Maps per-case snapshot file names to their corresponding test files.
 * @type {Record<string, string>}
 */
const suiteNameToTestFile = {
	StatsTest: path.resolve(__dirname, "../../StatsTestCases.basictest.js")
};

/**
 * Per-case snapshot file names of the suites split into parts by category.
 * @type {Record<string, "ConfigTestCases" | "ConfigCacheTestCases">}
 */
const suiteNameToPartedSuite = {
	ConfigTest: "ConfigTestCases",
	ConfigCacheTest: "ConfigCacheTestCases"
};

const SNAPSHOT_EXTENSION = ".snap";

/**
 * Per-kind snapshot names produced by matchKindSnapshot
 * (e.g. errors.snap, warnings.snap). These are resolved back to
 * a test file based on their directory location.
 * @type {Set<string>}
 */
const PER_KIND_NAMES = new Set(["errors", "warnings"]);

const casesDir = path.resolve(__dirname, "../../cases");
const configCasesDir = path.resolve(__dirname, "../../configCases");

/**
 * @param {string} snapshotPath a snapshot under `configCases`
 * @returns {string} the category of the case it belongs to
 */
const categoryOf = (snapshotPath) =>
	path.relative(configCasesDir, snapshotPath).split(path.sep)[0];

module.exports = {
	// Example test path, used for preflight consistency check of the implementation above
	testPathForConsistencyCheck: path.join(
		"some",
		"__tests__",
		"example.test.js"
	),

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
		if (suiteNameToPartedSuite[basename]) {
			return partFileOf(
				suiteNameToPartedSuite[basename],
				categoryOf(snapshotPath)
			);
		}

		// Per-kind snapshots (errors.snap, warnings.snap) from matchKindSnapshot.
		// Resolve to a test file based on the directory location.
		if (PER_KIND_NAMES.has(basename)) {
			if (snapshotPath.startsWith(casesDir + path.sep)) {
				return path.resolve(__dirname, "../../TestCasesNormal.basictest.js");
			}
			if (snapshotPath.startsWith(configCasesDir + path.sep)) {
				return partFileOf("ConfigTestCases", categoryOf(snapshotPath));
			}
		}

		// Default behavior: remove __snapshots__ dir and .snap extension
		return path.join(path.dirname(path.dirname(snapshotPath)), basename);
	}
};
