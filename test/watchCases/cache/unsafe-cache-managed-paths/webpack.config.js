"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {() => Configuration} */
module.exports = () => ({
	mode: "development",
	cache: {
		type: "memory"
	},
	snapshot: {
		managedPaths: [/^(.+?[\\/]node_modules[\\/])/]
	}
});
