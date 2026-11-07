"use strict";

const assert = require("assert");

module.exports = {
	/**
	 * @param {Error} error fatal validation error
	 * @param {import("webpack").Compiler | import("webpack").MultiCompiler} compiler watched compiler
	 * @returns {Promise<void>} recovery without another edit
	 */
	watchError(error, compiler) {
		expect(error.message).toContain("Injected entry validation failure");
		const watching = compiler.watching;
		assert(watching);
		return new Promise((resolve, reject) => {
			process.nextTick(() =>
				watching.invalidate((error) => (error ? reject(error) : resolve()))
			);
		});
	}
};
