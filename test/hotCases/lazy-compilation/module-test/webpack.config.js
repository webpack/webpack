"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			test: (module) =>
				!/moduleB/.test(/** @type {string} */ (module.nameForCondition()))
		}
	}
};
