"use strict";

const assert = require("assert");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @typedef {ReturnType<typeof import("../../../helpers/createIncrementalMutation")>} Mutation */

module.exports = {
	/**
	 * @param {{ MUTATION?: Mutation }} scope test scope
	 * @param {{ plugins: Mutation[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.MUTATION = options.plugins[0];
	},
	/**
	 * @param {Error} error detected regression
	 * @param {import("../../../..").Compiler | import("../../../..").MultiCompiler} compiler watched compiler
	 * @returns {Promise<void>} recovery with the original implementation
	 */
	async watchError(error, compiler) {
		expect(currentWatchStep.step).toBe("1");
		assert(!("compilers" in compiler));
		/** @type {Mutation} */ (compiler.options.plugins[0]).check(error);
		const watching = compiler.watching;
		assert(watching);
		await new Promise((resolve, reject) => {
			process.nextTick(() =>
				watching.invalidate((error) => (error ? reject(error) : resolve()))
			);
		});
	}
};
