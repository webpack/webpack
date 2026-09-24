"use strict";

const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new SharePlugin({
			shared: {
				// the nested 1.0.0 copies stay out of the share scope
				shared: {
					requiredVersion: "^2.0.0",
					include: { version: "^2.0.0" }
				},
				other: {
					requiredVersion: "^2.0.0",
					exclude: { version: "<2.0.0" }
				},
				"lib/": {
					include: { request: /^[ab]$/ },
					exclude: { request: "b" }
				},
				"./local": {
					shareKey: "local",
					version: "1.0.0",
					exclude: { version: "1" }
				}
			}
		})
	]
};
