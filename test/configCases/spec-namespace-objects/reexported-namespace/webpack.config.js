"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /index\.js$/, parser: { specNamespaceObject: true } }]
	}
};
