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
			`broad contexts: ${total} ${total === 1 ? "context matches" : "contexts match"} every file under a directory, so all of them are bundled:${list}\nA context with no filter takes whatever the directory holds, including files nothing ever requests. Passing a regExp to 'require.context', or 'ContextReplacementPlugin', narrows it to what is actually reachable.\nFor more info visit https://webpack.js.org/plugins/context-replacement-plugin/`
		);

		/** @type {string} */
		this.name = "BroadContextsWarning";
	}
}

module.exports = BroadContextsWarning;
