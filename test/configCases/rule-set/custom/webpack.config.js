"use strict";

/** @import { RuleSetUseFunction, RuleSetUseItem, Configuration } from "../../../../" */

/** @type {Configuration} */
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
								(data.resource).replace(/^.*[\\/]/g, ""),
							resourceQuery: data.resourceQuery,
							issuer: data.issuer.replace(/^.*[\\/]/g, "")
						}
					});
				}
			}
		]
	}
};
