"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	cache: { type: "memory" },
	// the importers come from the unsafe cache on the rebuild
	module: { unsafeCache: true }
};
