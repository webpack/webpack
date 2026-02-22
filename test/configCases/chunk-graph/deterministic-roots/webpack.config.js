"use strict";

const { getFullChunkName } = require("../../../../lib/ids/IdHelpers");

/** @typedef {import("../../../../").Chunk} Chunk */

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.chunkIds.tap(
						{
							name: "Test",
							stage: 100
						},
						(chunks) => {
							for (const /** @type {Chunk} */ chunk of chunks) {
								// Only test async chunk here
								if (chunk.canBeInitial()) continue;
								expect(
									getFullChunkName(
										chunk,
										compilation.chunkGraph,
										compiler.context,
										compiler.root
									)
								).toBe("./c.js");
							}
						}
					);
				});
			}
		}
	]
};
