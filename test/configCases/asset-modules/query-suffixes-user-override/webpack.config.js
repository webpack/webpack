"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		futureDefaults: true
	},
	module: {
		rules: [
			// A user rule for `?raw` must win over the futureDefaults default,
			// which would otherwise map it to `asset/source`.
			{
				resourceQuery: /(\?|&)raw(&|$)/,
				type: "asset/resource"
			}
		]
	}
};
