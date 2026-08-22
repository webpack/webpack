/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} BroadContextDetails
 * @property {string} name the context as written, shortened for the report
 * @property {number} modules how many distinct modules it matched
 * @property {number} size bytes those modules contribute
 */

class BroadContextsWarning extends WebpackError {
	/**
	 * Creates an instance of BroadContextsWarning.
	 * @param {BroadContextDetails[]} contexts the worst offenders, largest first
	 * @param {number} total how many broad contexts there are in all
	 */
	constructor(contexts, total) {
		const list = contexts
			.map(
				(context) =>
					`\n  ${context.name} (${context.modules} modules, ${formatSize(
						context.size
					)})`
			)
			.join("");

		super(
			`broad contexts: ${total} ${total === 1 ? "context matches" : "contexts match"} every file under a directory:${list}\nA pattern opening with a bare wildcard takes whatever the directory holds, including files nothing ever requests — a sync context bundles them all, a lazy one gives each its own chunk. Narrowing the pattern, or 'ContextReplacementPlugin', limits it to what is reachable.\nFor more info visit https://webpack.js.org/plugins/context-replacement-plugin/`
		);

		/** @type {string} */
		this.name = "BroadContextsWarning";
	}
}

module.exports = BroadContextsWarning;
