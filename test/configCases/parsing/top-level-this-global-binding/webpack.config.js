"use strict";

// Only a target that has the binding spells the global object `globalThis`,
// so these are the cases whose bundles need one to run.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./entry-global-this.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		},
		output: {
			environment: {
				globalThis: true
			}
		}
	},
	{
		target: "node",
		// a module declaring `globalThis` itself must still reach the real global
		entry: "./entry-shadowed.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		},
		output: {
			environment: {
				globalThis: true
			}
		}
	}
];
