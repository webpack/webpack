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
	str = str.replace(/\\/g, "/");
	const testDirNorm = testDirectory.replace(/\\/g, "/");
	const root = getWebpackRoot(testDirectory);
	const rootNorm = root ? root.replace(/\\/g, "/") : "";
	// Replace more-specific test dir first, then the broader root
	str = str.replace(new RegExp(quoteMeta(testDirNorm), "g"), "<TEST_DIR>");
	if (rootNorm) {
		str = str.replace(new RegExp(quoteMeta(rootNorm), "g"), "<WEBPACK_ROOT>");
		// Replace ancestor directories above webpack root.
		// The resolver walks up to the filesystem root looking for
		// node_modules, producing paths like /Users/x/node_modules.
		let ancestor = path.dirname(root);
		while (ancestor !== path.dirname(ancestor)) {
			str = str.replace(
				new RegExp(quoteMeta(ancestor.replace(/\\/g, "/")), "g"),
				"<ANCESTOR>"
			);
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
	// Normalize engine-specific JSON.parse error text (V8 "Unexpected token …
	// (0x..)" / "… in JSON …" vs JSC/Bun "JSON Parse error: …") so JSON
	// type-import "Module parse failed" snapshots match across runtimes. The
	// acorn "(line:col)" parse errors are engine-independent and left as-is.
	str = str.replace(
		/Module parse failed: (?:JSON Parse error:|Unexpected token "[^"]*" \(0x|Unexpected \S+ in JSON|Unexpected end of JSON input|Unexpected non-whitespace character after JSON)[\s\S]*?(?=\nYou may need an appropriate loader)/g,
		"Module parse failed: <JSON parse error>"
	);
	// Normalize JSC (Bun) magic-comment parse phrasing to the V8 form: JSC
	// quotes the token and appends "Expected …", V8 does neither.
	str = str.replace(/(Unexpected token) '([^']*)'\. Expected[^\n]*/g, "$1 $2");
	str = str.replace(/(Unexpected identifier)\. Expected[^\n]*/g, "$1");
	// Normalize "Unexpected token" messages — quoting and detail
	// format varies across Node.js versions (e.g. with/without quotes,
	// hex codes, trailing context).
	str = str.replace(/(Unexpected token) '([^']*)'$/gm, "$1 $2");
	str = str.replace(/(Unexpected token[^)]*\))[^\n]*(?:\n['"])?/g, "$1");
	return str;
};

/**
 * Serializes an array of error/warning objects into a normalized form
 * suitable for Jest snapshot matching. Absolute paths are replaced with
 * placeholders so snapshots stay stable across environments.
 * @param {EXPECTED_ANY[]} items stats errors or warnings from stats.toJson()
 * @param {string} testDirectory absolute path to the test case directory
 * @returns {EXPECTED_ANY[]} normalized items for snapshot comparison
 */
const normalizeForSnapshot = (items, testDirectory) =>
	items.map((item) => normalizeString(item.message, testDirectory) || "");

/**
 * @param {EXPECTED_ANY} expected expected value or RegExp or array
 * @param {EXPECTED_ANY} actual actual value
 * @returns {boolean} whether actual matches expected
 */
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

/**
 * @param {EXPECTED_ANY} object stats item or RegExp
 * @returns {string} explanation string
 */
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

/**
 * @param {EXPECTED_ANY[]} actual actual items
 * @param {EXPECTED_ANY[]} expected expected items
 * @param {string} kind error/warning/etc
 * @returns {string} diff string
 */
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

/**
 * @param {string} testDirectory test directory
 * @param {EXPECTED_ANY} object stats object
 * @param {string} kind error/warning/etc
 * @param {string} filename filename or upperCaseKind when 6-arg form
 * @param {string | EXPECTED_ANY} upperCaseKind upperCaseKind or options when 6-arg form
 * @param {EXPECTED_ANY} options options or done when 6-arg form
 * @param {EXPECTED_ANY=} done done callback
 * @returns {boolean | undefined} true if expectation failed
 */
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
		if (diff) {
			return (
				done(
					new Error(
						`${upperCaseKind}s mismatch (${array.length} actual, ${expected.length} expected):\n\n${diff}\n\nCheck expected ${kind}s: ${expectedFilename}`
					)
				),
				true
			);
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
