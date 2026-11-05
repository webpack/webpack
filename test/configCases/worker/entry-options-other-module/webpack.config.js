"use strict";

/** @import { Compiler, EntryOptions } from "../../../../" */

class AssertWorkerEntryOptionsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"AssertWorkerEntryOptionsPlugin",
			(compilation) => {
				compilation.hooks.afterChunks.tap(
					"AssertWorkerEntryOptionsPlugin",
					() => {
						const entrypoints = compilation.asyncEntrypoints;
						if (entrypoints.length !== 1) {
							compilation.errors.push(
								new Error(
									`expected one worker entrypoint, got ${entrypoints.length}`
								)
							);
							return;
						}
						// Set only by the block in other.js, which joins the entrypoint
						// that index.js created and must not change its options.
						const { publicPath } = /** @type {EntryOptions} */ (
							entrypoints[0].options
						);
						if (publicPath !== undefined) {
							compilation.errors.push(
								new Error(
									`expected no worker publicPath, got ${JSON.stringify(publicPath)}`
								)
							);
						}
					}
				);
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new AssertWorkerEntryOptionsPlugin()]
};
