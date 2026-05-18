"use strict";

const path = require("path");
const fs = require("graceful-fs");
const { matchKindSnapshot } = require("./harness/snapshot");

/**
 * @param {string} str string to escape for use in a RegExp
 * @returns {string} escaped string
 */
const quoteMeta = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Derives the webpack root directory from a test directory path.
 * @param {string} testDirectory absolute path to the test case directory
 * @returns {string} webpack root path, or empty string if not found
 */
const getWebpackRoot = (testDirectory) => {
	const idx = testDirectory.lastIndexOf(`${path.sep}test${path.sep}`);
	return idx !== -1 ? testDirectory.slice(0, idx) : "";
};

/**
 * Replaces absolute paths in a string with stable placeholders
 * so that snapshots are portable across machines.
 * @param {string} str the string to normalize
 * @param {string} testDirectory absolute path to the test case directory
 * @returns {string} normalized string
 */
const normalizeString = (str, testDirectory) => {
	if (!str) return str;
	const root = getWebpackRoot(testDirectory);
	// Replace more-specific test dir first, then the broader root
	str = str.replace(new RegExp(quoteMeta(testDirectory), "g"), "<TEST_DIR>");
	if (root) {
		str = str.replace(new RegExp(quoteMeta(root), "g"), "<WEBPACK_ROOT>");
		// Replace ancestor directories above webpack root.
		// The resolver walks up to the filesystem root looking for
		// node_modules, producing paths like /Users/x/node_modules.
		let ancestor = path.dirname(root);
		while (ancestor !== path.dirname(ancestor)) {
			str = str.replace(new RegExp(quoteMeta(ancestor), "g"), "<ANCESTOR>");
			ancestor = path.dirname(ancestor);
		}
	}
	// Normalize the output directory suite name (e.g. test/js/ConfigTestCases/
	// vs test/js/ConfigCacheTestCases/) so all suites produce identical snapshots.
	str = str.replace(/(<WEBPACK_ROOT>\/test\/js\/)[^/]+\//g, "$1<OUTPUT>/");
	// Strip stack trace lines — line numbers vary across Node.js versions
	// and between runs (e.g. processTicksAndRejections).
	str = str
		.split("\n")
		.filter((line) => !/^\s+at\s/.test(line))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	// Normalize "Unexpected token" messages — quoting and detail
	// format varies across Node.js versions (e.g. with/without quotes,
	// hex codes, trailing context).
	str = str.replace(/(Unexpected token) '([^']*)'$/gm, "$1 $2");
	str = str.replace(/(Unexpected token[^)]*\))[^\n]*(?:\n['"])?/g, "$1");
	str = str.replace(/\\/g, "/");
	return str;
};

/**
 * Fields to include in snapshot serialization.
 * Only stable, meaningful fields should be listed here —
 * nondeterministic fields (e.g. moduleTrace, details) are excluded.
 * @type {ReadonlyArray<{ key: string, normalize?: boolean }>}
 */
const SNAPSHOT_FIELDS = [
	{ key: "message", normalize: true },
	{ key: "moduleName", normalize: true },
	{ key: "loc" },
	{ key: "compilerPath" }
];

/**
 * Serializes an array of error/warning objects into a normalized form
 * suitable for Jest snapshot matching. Absolute paths are replaced with
 * placeholders so snapshots stay stable across environments.
 * @param {EXPECTED_ANY[]} items stats errors or warnings from stats.toJson()
 * @param {string} testDirectory absolute path to the test case directory
 * @returns {EXPECTED_ANY[]} normalized items for snapshot comparison
 */
const normalizeForSnapshot = (items, testDirectory) =>
	items.map((item) => {
		const result = {};
		for (const { key, normalize } of SNAPSHOT_FIELDS) {
			if (item[key]) {
				result[key] = normalize
					? normalizeString(item[key], testDirectory)
					: item[key];
			}
		}
		return result;
	});

const check = (expected, actual) => {
	if (expected instanceof RegExp) {
		expected = { message: expected };
	}
	if (Array.isArray(expected)) {
		return expected.every((e) => check(e, actual));
	}
	return Object.keys(expected).every((key) => {
		let value = actual[key];
		if (typeof value === "object") {
			value = JSON.stringify(value);
		}
		return expected[key].test(value);
	});
};

const explain = (object) => {
	if (object instanceof RegExp) {
		object = { message: object };
	}
	return Object.keys(object)
		.map((key) => {
			let value = object[key];
			if (typeof value === "object" && !(value instanceof RegExp)) {
				value = JSON.stringify(value);
			}
			let msg = `${key} = ${value}`;
			if (key !== "stack" && key !== "details" && msg.length > 100) {
				msg = `${msg.slice(0, 97)}...`;
			}
			return msg;
		})
		.join("; ");
};

const diffItems = (actual, expected, kind) => {
	const tooMuch = [...actual];
	const missing = [...expected];
	for (let i = 0; i < missing.length; i++) {
		const current = missing[i];
		for (let j = 0; j < tooMuch.length; j++) {
			if (check(current, tooMuch[j])) {
				tooMuch.splice(j, 1);
				missing.splice(i, 1);
				i--;
				break;
			}
		}
	}
	const diff = [];
	if (missing.length > 0) {
		diff.push(`The following expected ${kind}s are missing:
${missing.map((item) => `${explain(item)}`).join("\n\n")}`);
	}
	if (tooMuch.length > 0) {
		diff.push(`The following ${kind}s are unexpected:
${tooMuch.map((item) => `${explain(item)}`).join("\n\n")}`);
	}
	return diff.join("\n\n");
};

module.exports = function checkArrayExpectation(
	testDirectory,
	object,
	kind,
	filename,
	upperCaseKind,
	options,
	done
) {
	if (!done) {
		done = options;
		options = upperCaseKind;
		upperCaseKind = filename;
		filename = `${kind}s`;
	}
	let array = object[`${kind}s`];
	if (Array.isArray(array) && kind === "warning") {
		array = array.filter((item) => !/from Terser/.test(item));
	}
	if (fs.existsSync(path.join(testDirectory, `${filename}.js`))) {
		const expectedFilename = path.join(testDirectory, `${filename}.js`);

		let expected = require(expectedFilename);

		if (typeof expected === "function") {
			expected = expected(options);
		}
		const diff = diffItems(array, expected, kind);
		if (expected.length < array.length) {
			return (
				done(
					new Error(
						`More ${kind}s (${array.length} instead of ${expected.length}) while compiling than expected:\n\n${diff}\n\nCheck expected ${kind}s: ${expectedFilename}`
					)
				),
				true
			);
		} else if (expected.length > array.length) {
			return (
				done(
					new Error(
						`Less ${kind}s (${array.length} instead of ${expected.length}) while compiling than expected:\n\n${diff}\n\nCheck expected ${kind}s: ${expectedFilename}`
					)
				),
				true
			);
		}
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(expected[i])) {
				for (const expectedItem of expected[i]) {
					if (!check(expectedItem, array[i])) {
						return (
							done(
								new Error(
									`${upperCaseKind} ${i}: ${explain(
										array[i]
									)} doesn't match ${explain(expectedItem)}`
								)
							),
							true
						);
					}
				}
			} else if (!check(expected[i], array[i])) {
				return (
					done(
						new Error(
							`${upperCaseKind} ${i}: ${explain(
								array[i]
							)} doesn't match ${explain(expected[i])}`
						)
					),
					true
				);
			}
		}
	} else if (array.length > 0) {
		if (kind === "error" || kind === "warning") {
			// Snapshot-based matching when no expectation file exists.
			// Uses a dedicated snap file per kind (e.g. errors.snap)
			// with a stable key shared across all test suites.
			try {
				const normalized = normalizeForSnapshot(array, testDirectory);
				matchKindSnapshot(testDirectory, filename, normalized);
			} catch (err) {
				return (done(err), true);
			}
		} else {
			return (
				done(
					new Error(
						`${upperCaseKind}s while compiling:\n\n${array
							.map(explain)
							.join("\n\n")}`
					)
				),
				true
			);
		}
	}
};
