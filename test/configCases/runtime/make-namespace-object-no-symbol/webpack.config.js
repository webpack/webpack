"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		// no `Symbol`, so `__webpack_require__.r` has to feature-test the tag
		environment: { symbol: false }
	}
};
