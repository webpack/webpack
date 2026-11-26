"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		unknownContextRegExp: /^\.\//,
		unknownContextCritical: false,
		exprContextRegExp: /^\.\//,
		exprContextCritical: false
	}
};
