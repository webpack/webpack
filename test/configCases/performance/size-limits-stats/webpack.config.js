"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	performance: {
		hints: "stats",
		// Any bundle exceeds this, so the size hint always fires.
		maxAssetSize: 1,
		maxEntrypointSize: 1
	}
};
