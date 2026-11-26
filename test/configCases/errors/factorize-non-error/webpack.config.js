"use strict";

/** @import Compiler from "../../../../lib/Compiler.js" */
/** @import { Configuration } from "../../../../" */

// A tap that fails with something that is not an Error still has to say what
// it failed with, so the value is wrapped rather than read as one.
class RejectWithString {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.normalModuleFactory.tap(
			"RejectWithString",
			(normalModuleFactory) => {
				normalModuleFactory.hooks.beforeResolve.tapAsync(
					"RejectWithString",
					(resolveData, callback) => {
						if (!/rejected/.test(resolveData.request)) return callback();

						// The literal is the point: a tap may fail with anything.
						callback(/** @type {EXPECTED_ANY} */ ("the tap gave up"));
					}
				);
			}
		);
	}
}

/** @type {Configuration} */
module.exports = {
	mode: "development",
	plugins: [new RejectWithString()]
};
