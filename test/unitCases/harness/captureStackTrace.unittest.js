"use strict";

// A test file runs in a vm context, where jest reads a failure's message from
// `stack` and drops a frame named `<anonymous>`, as `bun-preload.js` relies on.
describe("Error.captureStackTrace in a test file", () => {
	/**
	 * @returns {Error} an error captured the way `expect` captures a failure
	 */
	const failure = () => {
		const error = new Error("first line\nsecond line");
		Error.captureStackTrace(error, failure);
		return error;
	};

	it("keeps the `Name: message` lines first", () => {
		expect(
			/** @type {string} */ (failure().stack).startsWith(
				"Error: first line\nsecond line\n"
			)
		).toBe(true);
	});

	it("names this file in a frame jest keeps", () => {
		const frames = /** @type {string} */ (failure().stack)
			.split("\n")
			.filter((line) => /^\s+at .*captureStackTrace\.unittest\.js:\d+/.test(line));
		expect(frames.length).toBeGreaterThan(0);
		for (const frame of frames) expect(frame).not.toMatch(/^\s+at <anonymous>/);
	});
});
