"use strict";

const assert = require("assert");

module.exports = {
	/** @returns {string} entry bundle */
	findBundle() {
		return "./main.js";
	},
	/**
	 * @param {Error} error fatal watch error
	 * @param {import("webpack").Compiler | import("webpack").MultiCompiler} compiler watched compiler
	 * @returns {Promise<void>} recovery on the same compiler
	 */
	watchError(error, compiler) {
		expect(error.message).toContain("Injected failure before late entries");
		assert(!("compilers" in compiler));
		const watching = compiler.watching;
		assert(watching);
		return new Promise((resolve, reject) => {
			process.nextTick(() => {
				watching.invalidate((recoveryError) => {
					if (recoveryError) reject(recoveryError);
					else resolve();
				});
			});
		});
	}
};
