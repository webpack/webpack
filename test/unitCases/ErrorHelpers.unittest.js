"use strict";

const fs = require("fs");
const path = require("path");
const RequestShortener = require("../../lib/RequestShortener");
const ErrorHelpers = require("../../lib/errors/ErrorHelpers");
const NonErrorEmittedError = require("../../lib/errors/NonErrorEmittedError");

const { toError } = ErrorHelpers;
const REPOSITORY_ROOT = path.join(__dirname, "..", "..");
const LIB_ROOT = path.join(REPOSITORY_ROOT, "lib");

/**
 * @param {string} dir directory to walk
 * @param {string[]} found accumulator
 * @returns {string[]} every .js file under dir
 */
const walkJsFiles = (dir, found = []) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkJsFiles(full, found);
		else if (entry.name.endsWith(".js")) found.push(full);
	}
	return found;
};

describe("ErrorHelpers.toError", () => {
	it("should return an error as it is", () => {
		const error = new Error("loader boom");

		expect(toError(error)).toBe(error);
	});

	it("should name the value something failed with instead", () => {
		const error = toError("the tap gave up");

		expect(error).toBeInstanceOf(NonErrorEmittedError);
		expect(error.message).toBe(
			"(Emitted value instead of an instance of Error) the tap gave up"
		);
	});

	it("should not start the stack at the wrapping", () => {
		// an engine that hands back no frames at all still must not name this one
		expect(toError("the tap gave up").stack || "").not.toContain(
			"ErrorHelpers.js"
		);
	});
});

describe("ErrorHelpers.contextifyStackFrames", () => {
	const shortener = new RequestShortener(REPOSITORY_ROOT);

	/**
	 * @param {string} file file the frame names
	 * @returns {string} the frame as an engine writes it
	 */
	const frameNaming = (file) => `    at doThing (${file}:12:34)`;

	/**
	 * @param {string} file file the frame names
	 * @returns {boolean} whether the frame kept its line and column
	 */
	const keepsPosition = (file) =>
		/:\d+:\d+/.test(
			ErrorHelpers.contextifyStackFrames(frameNaming(file), shortener)
		);

	// A position in webpack's own source names a line the next release moves.
	// The prefix deciding that is derived from this file's own directory, so a
	// source file moving deeper is what silently narrows it.
	it("should drop the position of every frame naming a file under lib/", () => {
		const kept = walkJsFiles(LIB_ROOT)
			.filter(keepsPosition)
			.map((file) => path.relative(LIB_ROOT, file));

		expect(kept).toEqual([]);
	});

	it("should drop it whatever depth the file sits at", () => {
		expect(keepsPosition(path.join(LIB_ROOT, "NormalModule.js"))).toBe(false);
		expect(
			keepsPosition(path.join(LIB_ROOT, "errors", "ErrorHelpers.js"))
		).toBe(false);
	});

	it("should keep the position of a file the project owns", () => {
		expect(keepsPosition(path.join(REPOSITORY_ROOT, "src", "index.js"))).toBe(
			true
		);
	});
});
