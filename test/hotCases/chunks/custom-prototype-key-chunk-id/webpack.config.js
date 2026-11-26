"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

// A custom chunk id plugin may give a chunk an `Object.prototype` key as its id.

/** @type {Configuration} */
module.exports = {
	optimization: {
		chunkIds: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.chunkIds.tap("Test", (chunks) => {
					for (const chunk of chunks) {
						const name = /** @type {string} */ (chunk.name);
						chunk.id = name;
						chunk.ids = [name];
					}
				});
			});
		}
	]
};
