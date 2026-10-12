"use strict";

const assert = require("assert");

/** @type {WeakSet<Error>} */
const reportedErrors = new WeakSet();

module.exports = {
	/**
	 * @param {Error} error fatal watch error
	 * @param {import("../../../..").Compiler | import("../../../..").MultiCompiler} compiler watched compiler
	 * @returns {Promise<void>} recovery without another edit
	 */
	watchError(error, compiler) {
		expect(error.message).toContain("Injected plugin failure in ");
		expect(reportedErrors.has(error)).toBe(false);
		reportedErrors.add(error);
		assert(!("compilers" in compiler));
		const watching = compiler.watching;
		assert(watching);
		return new Promise((resolve, reject) => {
			let callbacks = 0;
			// The failing build drains its invalidation callbacks after reporting the error.
			process.nextTick(() => {
				watching.invalidate((recoveryError) => {
					expect(++callbacks).toBe(1);
					if (recoveryError) reject(recoveryError);
					else resolve();
				});
			});
		});
	}
};
