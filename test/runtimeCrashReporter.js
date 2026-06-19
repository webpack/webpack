"use strict";

const fs = require("fs");

// Logs each test file and test case right before it runs, synchronously to
// stderr so the line survives even a runtime abort that no JS try/catch can
// catch (e.g. a Deno hard-panic). The triggering test is then the last logged
// line, which is otherwise impossible to identify because the abort prints no
// test name.
module.exports = class RuntimeCrashReporter {
	/**
	 * @param {{ path: string }} test test
	 */
	onTestFileStart(test) {
		fs.writeSync(2, `RUNTIME-FILE-START ${test.path}\n`);
	}

	/**
	 * @param {{ path: string }} test test
	 */
	onTestStart(test) {
		fs.writeSync(2, `RUNTIME-FILE-START ${test.path}\n`);
	}

	/**
	 * @param {{ path: string }} test test
	 * @param {{ fullName: string }} testCaseStartInfo test case info
	 */
	onTestCaseStart(test, testCaseStartInfo) {
		fs.writeSync(2, `RUNTIME-CASE-START ${testCaseStartInfo.fullName}\n`);
	}
};
