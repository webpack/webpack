"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			test: { glob: "!moduleB.js" }
		}
	}
};
