/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

class UnusedRuleWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedRuleWarning.
	 * @param {string[]} paths config paths of the rules that never matched
	 */
	constructor(paths) {
		super(
			`webpack rule recommendations: \nThe following ${
				paths.length === 1 ? "rule was" : "rules were"
			} never applied to a module: ${paths.join(
				", "
			)}.\nA rule that matches nothing is usually a typo in 'test', 'include' or 'exclude', or a leftover from a removed file type.\nFor more info visit https://webpack.js.org/configuration/module/#modulerules`
		);

		/** @type {string} */
		this.name = "UnusedRuleWarning";
	}
}

module.exports = UnusedRuleWarning;
