"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /(m|inner)\.js$/, parser: { specNamespaceObject: true } }]
	}
};
