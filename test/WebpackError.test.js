"use strict";

const util = require("util");

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

	it("Should provide inspect method for use by for util.inspect", function() {
		const errorStr = util.inspect(new CustomError("Message"));
		const errorArr = errorStr.split("\n");

		expect(errorArr[0]).toEqual("CustomError: CustomMessage");
		expect(errorArr[1]).toContain("WebpackError.test.js");
		expect(errorArr[errorArr.length - 1]).toEqual("CustomDetails");
	});
});
