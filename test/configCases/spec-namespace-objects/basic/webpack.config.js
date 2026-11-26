"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
};
