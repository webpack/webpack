"use strict";

const path = require("path");
const { SnapshotState } = require("jest-snapshot");

/**
 * Gets the per-case snapshot path
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 * @returns {string} Snapshot path
 */
function getSnapshotPath(caseDir, suiteName) {
	suiteName = suiteName.replace(/Cases/, "");

	return path.join(caseDir, "__snapshots__", `${suiteName}.snap`);
}

/** @typedef {{ caseDir: string, suiteName: string, originalState: SnapshotState, perCaseState: SnapshotState, snapshotPath: string }} SnapshotContext */

/** @type {SnapshotContext[]} */
const activeSnapshotContexts = [];

/**
 * Creates a per-case SnapshotState
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 * @param {SnapshotState=} originalState Original snapshot state
 * @returns {SnapshotState} Per-case snapshot state
 */
function createPerCaseSnapshotState(
	caseDir,
	suiteName,
	originalState = expect.getState().snapshotState
) {
	const s = /** @type {EXPECTED_ANY} */ (originalState);
	return new SnapshotState(getSnapshotPath(caseDir, suiteName), {
		updateSnapshot: s._updateSnapshot,
		snapshotFormat: originalState.snapshotFormat,
		expand: originalState.expand,
		prettierPath: s._prettierPath,
		rootDir: s._rootDir || process.cwd()
	});
}

/**
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 * @returns {SnapshotContext} snapshot context
 */
function activateSnapshotState(caseDir, suiteName) {
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
}

/**
 * @param {SnapshotContext} snapshotContext snapshot context
 */
function deactivateSnapshotState(snapshotContext) {
	const index = activeSnapshotContexts.lastIndexOf(snapshotContext);
	if (index >= 0) {
		activeSnapshotContexts.splice(index, 1);
	}
}

/**
 * @param {SnapshotContext} snapshotContext snapshot context
 */
function finalizePerCaseSnapshotState(snapshotContext) {
	const { originalState, perCaseState } = snapshotContext;

	if (perCaseState.getUncheckedCount()) {
		perCaseState.removeUncheckedKeys();
	}
	perCaseState.save();

	originalState.unmatched += perCaseState.unmatched;
	originalState.matched += perCaseState.matched;
	originalState.updated += perCaseState.updated;
	originalState.added += perCaseState.added;
}

/**
 * @returns {SnapshotState | undefined} the per-case state of the innermost active case
 */
function getActiveSnapshotState() {
	const snapshotContext =
		activeSnapshotContexts[activeSnapshotContexts.length - 1];

	return snapshotContext && snapshotContext.perCaseState;
}

/**
 * Registers per-case snapshot hooks
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} suiteName Name of the test suite
 */
function registerPerCaseSnapshotHooks(caseDir, suiteName) {
	/** @type {SnapshotContext | undefined} */
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
			deactivateSnapshotState(/** @type {EXPECTED_ANY} */ (snapshotContext));
			snapshotContext = undefined;
		}
	});
}

/**
 * Matches `received` against a snapshot stored in a dedicated per-kind
 * file (`<caseDir>/__snapshots__/<kind>.snap`). Uses a stable key
 * (`<kind> 1`) independent of the test suite name, so all suites
 * sharing the same test case match one snapshot entry.
 * @param {string} caseDir Absolute path to the test case directory
 * @param {string} kind Snapshot kind, used as filename (e.g. "errors")
 * @param {EXPECTED_ANY} received The value to match against the snapshot
 */
function matchKindSnapshot(caseDir, kind, received) {
	const snapshotPath = path.join(caseDir, "__snapshots__", `${kind}.snap`);
	const parentState =
		getActiveSnapshotState() || expect.getState().snapshotState;
	const ps = /** @type {EXPECTED_ANY} */ (parentState);

	const kindState = new SnapshotState(snapshotPath, {
		updateSnapshot: ps._updateSnapshot === "all" ? "all" : "none",
		snapshotFormat: parentState.snapshotFormat,
		expand: parentState.expand,
		prettierPath: ps._prettierPath,
		rootDir: ps._rootDir || process.cwd()
	});

	// Call jest-snapshot's toMatchSnapshot directly with a controlled
	// matcher context. Using `kind` as currentTestName produces the
	// stable key "<kind> 1" (e.g. "errors 1"), independent of suite.
	const { toMatchSnapshot } = require("jest-snapshot");

	const context = /** @type {EXPECTED_ANY} */ ({
		snapshotState: kindState,
		currentTestName: kind,
		isNot: false,
		promise: "",
		utils: require("jest-matcher-utils"),
		expand: false
	});

	try {
		const result = /** @type {import("expect").SyncExpectationResult} */ (
			toMatchSnapshot.call(context, received)
		);
		if (!result.pass) {
			throw new Error(result.message());
		}
	} finally {
		kindState.save();

		// Bubble counts up to the parent state so Jest reports them.
		parentState.unmatched += kindState.unmatched;
		parentState.matched += kindState.matched;
		parentState.updated += kindState.updated;
		parentState.added += kindState.added;
	}
}

module.exports.getActiveSnapshotState = getActiveSnapshotState;
module.exports.matchKindSnapshot = matchKindSnapshot;
module.exports.registerPerCaseSnapshotHooks = registerPerCaseSnapshotHooks;
