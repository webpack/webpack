"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = [
	{
		target: "web",
		mode: "development",
		module: {
			generator: {
				"css/auto": {
					esModule: false
				}
			}
		},
		experiments: {
			css: true
		}
	},
	{
		target: "node",
		mode: "development",
		module: {
			generator: {
				"css/auto": {
					esModule: false
				}
			}
		},
		experiments: {
			css: true
		}
	}
];
