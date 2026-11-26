"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /spec\.js$/, parser: { specNamespaceObject: true } }]
	}
};
