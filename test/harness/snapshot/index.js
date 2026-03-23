"use strict";

const path = require("path");
const { SnapshotState } = require("jest-snapshot");

/**
 * Gets the per-case snapshot path
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 * @returns {string} Snapshot path
 */
const getSnapshotPath = function (caseDir, suiteName) {
	suiteName = suiteName.replace(/Cases/, "");

	return path.join(caseDir, "__snapshots__", `${suiteName}.snap`);
};

const activeSnapshotContexts = [];

/**
 * Creates a per-case SnapshotState
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 * @param {SnapshotState} [originalState] Original snapshot state
 * @returns {SnapshotState} Per-case snapshot state
 */
const createPerCaseSnapshotState = function (
	caseDir,
	suiteName,
	originalState = expect.getState().snapshotState
) {
	return new SnapshotState(getSnapshotPath(caseDir, suiteName), {
		updateSnapshot: originalState._updateSnapshot,
		snapshotFormat: originalState.snapshotFormat,
		expand: originalState.expand,
		prettierPath: originalState._prettierPath,
		rootDir: originalState._rootDir || process.cwd()
	});
};

const activateSnapshotState = function (caseDir, suiteName) {
	const originalState = expect.getState().snapshotState;
	const snapshotContext = {
		caseDir,
		suiteName,
		originalState,
		perCaseState: createPerCaseSnapshotState(caseDir, suiteName, originalState),
		snapshotPath: getSnapshotPath(caseDir, suiteName)
	};

	activeSnapshotContexts.push(snapshotContext);
	return snapshotContext;
};

const deactivateSnapshotState = function (snapshotContext) {
	const index = activeSnapshotContexts.lastIndexOf(snapshotContext);
	if (index >= 0) {
		activeSnapshotContexts.splice(index, 1);
	}
};

const finalizePerCaseSnapshotState = function (snapshotContext) {
	const { originalState, perCaseState } = snapshotContext;

	if (perCaseState.getUncheckedCount()) {
		perCaseState.removeUncheckedKeys();
	}
	perCaseState.save();

	originalState.unmatched += perCaseState.unmatched;
	originalState.matched += perCaseState.matched;
	originalState.updated += perCaseState.updated;
	originalState.added += perCaseState.added;
};

const getActiveSnapshotState = function () {
	const snapshotContext =
		activeSnapshotContexts[activeSnapshotContexts.length - 1];

	return snapshotContext && snapshotContext.perCaseState;
};

/**
 * Registers per-case snapshot hooks
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 */
const registerPerCaseSnapshotHooks = function (caseDir, suiteName) {
	let snapshotContext;

	beforeAll(() => {
		snapshotContext = activateSnapshotState(caseDir, suiteName);
	});

	afterAll(() => {
		if (!snapshotContext) {
			return;
		}

		try {
			finalizePerCaseSnapshotState(snapshotContext);
		} finally {
			deactivateSnapshotState(snapshotContext);
			snapshotContext = undefined;
		}
	});
};

module.exports.getActiveSnapshotState = getActiveSnapshotState;
module.exports.registerPerCaseSnapshotHooks = registerPerCaseSnapshotHooks;
