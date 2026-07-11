"use strict";

/** @typedef {import("../../../../").RuleSetUseFunction} RuleSetUseFunction */
/** @typedef {import("../../../../").RuleSetUseItem} RuleSetUseItem */

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /[ab]\.js$/,
				/** @type {RuleSetUseFunction} */
				use(data) {
					return /** @type {RuleSetUseItem} */ ({
						loader: "./loader",
						options: {
							resource:
								/** @type {string} */
								(data.resource).replaceAll(/^.*[\\/]/g, ""),
							resourceQuery: data.resourceQuery,
							issuer: data.issuer.replaceAll(/^.*[\\/]/g, "")
						}
					});
				}
			}
		]
	}
};
