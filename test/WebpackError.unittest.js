"use strict";

const path = require("path");
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

	it("Should provide inspect method for use by for util.inspect", () => {
		const errorStr = util.inspect(new CustomError("Message"));
		const errorArr = errorStr.split("\n");

		expect(errorArr[0]).toBe("CustomError: CustomMessage");
		expect(errorArr[1]).toMatch(path.basename(__filename));
		expect(errorArr[errorArr.length - 1]).toBe("CustomDetails");
	});
});
