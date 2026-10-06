"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			test: { glob: "!moduleB.js" }
		}
	}
};
