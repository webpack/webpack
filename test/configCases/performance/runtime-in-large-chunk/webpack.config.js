"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// the runtime stays in the entry chunk, so it is rewritten whenever the
	// async chunk changes
	performance: {
		hints: "warning",
		maxEntrypointSize: 100,
		maxAssetSize: 1000000
	}
};
