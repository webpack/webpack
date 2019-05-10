"use strict";

const WebpackError = require("../lib/WebpackError");

describe("WebpackError", () => {
	class CustomError extends WebpackError {
		constructor(message) {
			super();

			this.name = "CustomError";
			this.message = "CustomMessage";
			this.details = "CustomDetails";

			Error.captureStackTrace(this, this.constructor);
		}
	}

	it("Should provide inspect method for use by for util.inspect", () => {
		const error = new CustomError("Message");
		expect(error.toString()).toContain("CustomError: CustomMessage");
		expect(error.stack).toContain(__filename);
	});
});
