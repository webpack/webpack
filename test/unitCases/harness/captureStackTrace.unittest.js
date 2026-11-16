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

	it("renders an `expect` failure with its message and code frame", () => {
		const { formatResultsErrors } = require("jest-message-util");

		/** @type {Error | undefined} */
		let error;
		try {
			expect(["received"]).toEqual([]);
		} catch (err) {
			error = /** @type {Error} */ (err);
		}
		const rendered = formatResultsErrors(
			[
				/** @type {import("@jest/test-result").AssertionResult} */ ({
					ancestorTitles: [],
					failureDetails: [error],
					failureMessages: [/** @type {string} */ (/** @type {Error} */ (error).stack)],
					fullName: "failure",
					numPassingAsserts: 0,
					status: "failed",
					title: "failure"
				})
			],
			/** @type {import("@jest/types").Config.ProjectConfig} */ (
				/** @type {unknown} */ ({ rootDir: __dirname, testMatch: [] })
			),
			{ noStackTrace: false }
		);
		const text = String(rendered).replace(
			// eslint-disable-next-line no-control-regex
			/\u001B\[[0-9;]*m/g,
			""
		);
		expect(text).toContain("expect(received).toEqual(expected)");
		expect(text).toContain('"received"');
		expect(text).toContain('expect(["received"]).toEqual([]);');
		expect(text).toMatch(/at .*captureStackTrace\.unittest\.js:\d+:\d+/);
	});
});
