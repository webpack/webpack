"use strict";

const fs = require("fs");

// Logs each test file right before it runs, synchronously to stderr so the line
// survives even a runtime abort that no JS try/catch can catch (e.g. a Deno
// hard-panic). The triggering file is then the last logged line, which is
// otherwise impossible to identify because the abort prints no test name.
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
};
