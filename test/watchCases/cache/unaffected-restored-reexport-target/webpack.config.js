"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = /** @type {const} */ (["memory", "filesystem"]).map(
	(type, index) => ({
		mode: "development",
		cache: { type },
		output: { filename: `bundle${index}.js`, clean: false },
		experiments: { cacheUnaffected: true }
	})
);
