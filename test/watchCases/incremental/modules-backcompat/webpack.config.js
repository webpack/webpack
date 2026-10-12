"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("BackCompatCheck", (stats) => {
					const modules = /** @type {EXPECTED_ANY} */ (
						stats.compilation.modules
					);
					if (modules.length !== modules.size) {
						throw new Error(
							`deprecated array access broken: length=${modules.length} size=${modules.size}`
						);
					}
				});
			}
		}
	]
};
