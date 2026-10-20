"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

// steps 2 and 5 restore the sources of step 0, so they must hash the same
const SAME_AS_FIRST = ["2", "5"];

/** @type {Map<string, string>} */
const hashes = new Map();

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		// export writes stay in the bundle, so whatever they would run is observed
		usedExports: false,
		concatenateModules: false,
		moduleIds: "named"
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"CommonJsExportsToggle",
				(compilation) => {
					compilation.hooks.afterHash.tap("CommonJsExportsToggle", () => {
						const step = String(currentWatchStep.step);
						const hash = /** @type {string} */ (compilation.hash);
						hashes.set(step, hash);
						if (SAME_AS_FIRST.includes(step) && hash !== hashes.get("0")) {
							compilation.errors.push(
								new (require("../../../../").WebpackError)(
									`step ${step} hashed ${hash}, step 0 hashed ${hashes.get("0")}`
								)
							);
						}
					});
				}
			);
		}
	]
};
