"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {const} */ (["memory", "filesystem"]).map(
	(type, index) => ({
		mode: "development",
		cache: { type },
		output: { filename: `bundle${index}.js`, clean: false }
	})
);
