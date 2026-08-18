/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../WebpackError");

/** @typedef {{ reason: string, count: number, names: string[] }} ScopeHoistingBailoutGroup */

/**
 * @param {ScopeHoistingBailoutGroup} group one reason and what it applied to
 * @returns {string} one printed line
 */
const formatGroup = ({ reason, count, names }) => {
	const shown = names.join(", ");
	const rest = count - names.length;

	return `  ${count} × ${reason}\n     ${shown}${rest > 0 ? ` and ${rest} more` : ""}`;
};

class ScopeHoistingBailoutsWarning extends WebpackError {
	/**
	 * Creates an instance of ScopeHoistingBailoutsWarning.
	 * @param {ScopeHoistingBailoutGroup[]} groups the reasons, most modules first
	 * @param {number} total how many modules were left out
	 */
	constructor(groups, total) {
		super(
			`scope hoisting: ${total} ${total === 1 ? "module was" : "modules were"} not merged into the scope of ${total === 1 ? "its importer" : "their importers"}, so each keeps its own wrapper:
${groups.map(formatGroup).join("\n")}

Concatenation needs a module to be ESM and statically analyzable. For more info visit https://webpack.js.org/plugins/module-concatenation-plugin/`
		);

		this.name = "ScopeHoistingBailoutsWarning";
	}
}

module.exports = ScopeHoistingBailoutsWarning;
