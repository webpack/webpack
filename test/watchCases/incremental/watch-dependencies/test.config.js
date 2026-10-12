"use strict";

const assert = require("assert");

module.exports = {
	strictWatchDependencies: true,
	/**
	 * @param {{ DETECTED?: Set<string> }} scope test scope
	 * @param {{ plugins: { detected: Set<string> }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.DETECTED = options.plugins[0].detected;
	},
	/**
	 * @param {Error} error comparison failure
	 * @param {import("../../../..").Compiler} compiler watched compiler
	 * @returns {Promise<void>} rebuild with the correct dependencies
	 */
	watchError(error, compiler) {
		/** @type {{ check: (error: Error) => void }} */ (
			compiler.options.plugins[0]
		).check(error);
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
