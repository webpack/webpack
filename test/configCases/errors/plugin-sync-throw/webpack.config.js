"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("ThrowInCompilation", () => {
					throw new Error("thrown synchronously from a compilation tap");
				});
			}
		}
	]
};
