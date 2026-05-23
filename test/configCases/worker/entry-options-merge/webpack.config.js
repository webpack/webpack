"use strict";

class AssertMergedEntryOptionsPlugin {
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
						if (entrypoint.options.asyncChunks !== false) {
							compilation.errors.push(
								new Error(
									`expected entrypoint.options.asyncChunks === false, got ${entrypoint.options.asyncChunks}`
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
