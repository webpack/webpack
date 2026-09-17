"use strict";

const { toError } = require("../../lib/errors/ErrorHelpers");
const NonErrorEmittedError = require("../../lib/errors/NonErrorEmittedError");

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
