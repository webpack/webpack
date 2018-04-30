"use strict";

const util = require("util");

require("should");
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

		errorArr[0].should.equal("CustomError: CustomMessage");
		errorArr[1].should.containEql("WebpackError.unittest.js");
		errorArr[errorArr.length - 1].should.equal("CustomDetails");
	});
});
