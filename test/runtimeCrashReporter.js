"use strict";

const fs = require("node:fs");

// Bun's stderr is a non-blocking pipe: a sync write can throw EAGAIN when full.
// Retry (1ms backoff) until flushed; Node/Deno's blocking fd 2 never hit this.
const SLEEP = new Int32Array(new SharedArrayBuffer(4));
function writeStderrSync(line) {
	const buf = Buffer.from(line);
	let offset = 0;
	while (offset < buf.length) {
		try {
			offset += fs.writeSync(2, buf, offset);
		} catch (err) {
			if (err.code !== "EAGAIN") throw err;
			Atomics.wait(SLEEP, 0, 0, 1);
		}
	}
}

// Logs each test file right before it runs, synchronously to stderr so the line
// survives even a runtime abort that no JS try/catch can catch (e.g. a Deno
// hard-panic or Bun segfault); the crashed file is then the last logged line.
// Per-file only (not per-case) to keep CI output readable; rerun that one file
// locally to narrow down the case.
module.exports = class RuntimeCrashReporter {
	constructor() {
		/** @type {string | undefined} */
		this._last = undefined;
	}

	/**
	 * @param {string} path test file path
	 */
	_logFile(path) {
		if (path === this._last) return;
		this._last = path;
		writeStderrSync(`RUNTIME-FILE-START ${path}\n`);
	}

	/**
	 * @param {{ path: string }} test test
	 */
	onTestFileStart(test) {
		this._logFile(test.path);
	}

	/**
	 * @param {{ path: string }} test test
	 */
	onTestStart(test) {
		this._logFile(test.path);
	}
};
