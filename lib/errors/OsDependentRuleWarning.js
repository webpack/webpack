/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class OsDependentRuleWarning extends WebpackError {
	/**
	 * Creates an instance of OsDependentRuleWarning.
	 * @param {string[]} rules descriptions of the rules whose paths only match on one operating system
	 */
	constructor(rules) {
		super(
			`webpack rule recommendations: \nThe following ${
				rules.length === 1
					? "condition hardcodes a path separator, so it"
					: "conditions hardcode a path separator, so they"
			} only match on one operating system: ${rules.join(
				", "
			)}.\nConditions are matched against native paths, which use '\\' on Windows and '/' elsewhere, so such a rule silently stops matching on the other one. Write '[\\\\/]' to accept both.\nFor more info visit https://webpack.js.org/configuration/module/#condition`
		);

		/** @type {string} */
		this.name = "OsDependentRuleWarning";
	}
}

module.exports = OsDependentRuleWarning;
