"use strict";

module.exports = {
	validate(stats) {
		const errors = stats.toJson().errors;
		// 1. Check that we actually got an error
		if (errors.length === 0) {
			throw new Error("Should have failed with an error");
		}

		// 2. Check that your custom message is there
		const message = errors[0].message;
		if (!message.includes("DefinePlugin: Error evaluating value")) {
			throw new Error(`Custom error message missing! Found: ${message}`);
		}
		if (!message.includes("Hint:")) {
			throw new Error("Hint missing from error message!");
		}
	}
};
