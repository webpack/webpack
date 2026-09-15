"use strict";

const { toError } = require("../lib/ErrorHelpers");
const NonErrorEmittedError = require("../lib/errors/NonErrorEmittedError");

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

	it("should start the stack where the value was caught", () => {
		const frame = /** @type {string} */ (toError("the tap gave up").stack)
			.split("\n")
			.find((line) => /^\s+at\s/.test(line));

		expect(frame).toContain("ErrorHelpers.unittest.js");
	});
});
