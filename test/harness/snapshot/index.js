"use strict";

const path = require("path");
const { SnapshotState } = require("jest-snapshot");

/**
 * Creates a per-case SnapshotState that stores snapshots in the test case directory.
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite (e.g., "ConfigTestCases", "StatsTestCases")
 * @returns {{ swapIn: () => void, swapOut: () => void }} res
 */
const createPerCaseSnapshotState = function (caseDir, suiteName) {
	suiteName = suiteName.replace(/Cases/, "");
	const snapshotPath = path.join(caseDir, "__snapshots__", `${suiteName}.snap`);

	const originalState = expect.getState().snapshotState;

	const perCaseState = new SnapshotState(snapshotPath, {
		updateSnapshot: originalState._updateSnapshot,
		snapshotFormat: originalState.snapshotFormat,
		prettierPath: originalState._prettierPath || null,
		rootDir: originalState._rootDir || process.cwd()
	});

	let savedOriginalState = null;

	return {
		swapIn() {
			savedOriginalState = expect.getState().snapshotState;
			expect.setState({ snapshotState: perCaseState });
		},
		swapOut() {
			const uncheckedCount = perCaseState.getUncheckedCount();
			if (uncheckedCount) {
				perCaseState.removeUncheckedKeys();
			}
			perCaseState.save();

			// Aggregate stats back to original state
			if (savedOriginalState) {
				savedOriginalState.unmatched += perCaseState.unmatched;
				savedOriginalState.matched += perCaseState.matched;
				savedOriginalState.updated += perCaseState.updated;
				savedOriginalState.added += perCaseState.added;

				expect.setState({ snapshotState: savedOriginalState });
			}
		}
	};
};

/**
 * Registers per-case snapshot hooks for a describe scope
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite (e.g., "ConfigTestCases", "StatsTestCases")
 */
const registerPerCaseSnapshotHooks = function (caseDir, suiteName) {
	let perCaseSnapshotState;

	beforeAll(() => {
		perCaseSnapshotState = createPerCaseSnapshotState(caseDir, suiteName);
		perCaseSnapshotState.swapIn();
	});

	afterAll(() => {
		if (perCaseSnapshotState) perCaseSnapshotState.swapOut();
	});
};

module.exports.createPerCaseSnapshotState = createPerCaseSnapshotState;
module.exports.registerPerCaseSnapshotHooks = registerPerCaseSnapshotHooks;
