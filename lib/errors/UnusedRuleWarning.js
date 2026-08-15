/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnusedRuleWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedRuleWarning.
	 * @param {string[]} rules descriptions of the rules that never matched
	 */
	constructor(rules) {
		super(
			`webpack rule recommendations: \nThe following ${
				rules.length === 1 ? "rule was" : "rules were"
			} never applied to a module: ${rules.join(
				", "
			)}.\nA rule that matches nothing is usually a typo in 'test', 'include' or 'exclude', or a leftover from a removed file type. Plugins add rules as well, so a rule listed here may come from a plugin rather than from your configuration.\nFor more info visit https://webpack.js.org/configuration/module/#modulerules`
		);

		/** @type {string} */
		this.name = "UnusedRuleWarning";
	}
}

module.exports = UnusedRuleWarning;
