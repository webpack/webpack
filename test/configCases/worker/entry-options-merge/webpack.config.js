"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").EntryOptions} EntryOptions */

class AssertMergedEntryOptionsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"AssertMergedEntryOptionsPlugin",
			(compilation) => {
				compilation.hooks.afterChunks.tap(
					"AssertMergedEntryOptionsPlugin",
					() => {
						const entrypoint = compilation.namedChunkGroups.get("merged");
						if (!entrypoint) {
							compilation.errors.push(
								new Error("expected a chunk group named 'merged'")
							);
							return;
						}
						// Set only by the second async block; the merge in
						// buildChunkGraph must copy it onto the existing entrypoint.
						const options = /** @type {EntryOptions} */ (entrypoint.options);
						if (options.asyncChunks !== false) {
							compilation.errors.push(
								new Error(
									`expected entrypoint.options.asyncChunks === false, got ${options.asyncChunks}`
								)
							);
						}
						if (entrypoint.origins.length !== 2) {
							compilation.errors.push(
								new Error(
									`expected 2 origins on the shared entrypoint, got ${entrypoint.origins.length}`
								)
							);
						}
						// Prototype-polluting keys from the magic comment must not be
						// gap-filled onto the entrypoint options.
						for (const unsafe of ["prototype", "constructor", "__proto__"]) {
							if (Object.hasOwn(options, unsafe)) {
								compilation.errors.push(
									new Error(`entrypoint options must not carry "${unsafe}"`)
								);
							}
						}
						if (Object.getPrototypeOf(options) !== Object.prototype) {
							compilation.errors.push(
								new Error("entrypoint options prototype must be untouched")
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
	output: {
		chunkFilename: "chunk-[name].js"
	},
	optimization: {
		chunkIds: "named"
	},
	plugins: [new AssertMergedEntryOptionsPlugin()]
};
