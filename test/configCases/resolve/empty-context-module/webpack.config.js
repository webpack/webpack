"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		cache: true,
		resolve: {
			alias: {
				foo: false
			},
			unsafeCache: true
		}
	},
	{
		resolve: {
			alias: {
				foo: false
			},
			unsafeCache: true
		}
	}
];
