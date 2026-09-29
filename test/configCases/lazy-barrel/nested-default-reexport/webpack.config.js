"use strict";

const path = require("path");

/** @import { NormalModule } from "../../../../" */

/** @type {(concatenateModules: boolean) => import("../../../../").Configuration} */
const config = (concatenateModules) => ({
	mode: "production",
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		concatenateModules,
		minimize: false
	},
	plugins: [
		(compiler) => {
			// module set, not buildModule: cache-restored modules skip building
			compiler.hooks.done.tap("Test", (stats) => {
				const resources = new Set();
				for (const module of stats.compilation.modules) {
					resources.add(/** @type {NormalModule} */ (module).resource);
				}
				expect(
					resources.has(path.resolve(__dirname, "lib/Button/Button.mjs"))
				).toBe(true);
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
