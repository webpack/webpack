"use strict";

// A custom chunk id plugin may give a chunk an `Object.prototype` key as its id.

/** @type {import("../../../../types").Configuration} */
module.exports = {
	optimization: {
		chunkIds: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.chunkIds.tap("Test", (chunks) => {
					for (const chunk of chunks) {
						chunk.id = chunk.name;
						chunk.ids = [chunk.id];
					}
				});
			});
		}
	]
};
