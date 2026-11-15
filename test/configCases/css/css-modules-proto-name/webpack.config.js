"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		experiments: {
			css: true
		},
		module: {
			generator: {
				"css/auto": {
					localIdentName: "[local]"
				}
			}
		}
	},
	{
		target: "web",
		mode: "production",
		experiments: {
			css: true
		},
		module: {
			generator: {
				"css/auto": {
					localIdentName: "[local]"
				}
			}
		}
	}
];
