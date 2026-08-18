/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../WebpackError");

/** @typedef {{ name: string, size: number }} DynamicExportsDetails */

class DynamicExportsWarning extends WebpackError {
	/**
	 * Creates an instance of DynamicExportsWarning.
	 * @param {DynamicExportsDetails[]} modules the modules to name, largest first
	 * @param {number} total how many were found
	 */
	constructor(modules, total) {
		super(
			`dynamic exports: webpack cannot tell what ${total} ${total === 1 ? "module exports" : "modules export"}, so nothing importing ${total === 1 ? "it" : "them"} can be tree-shaken:
${modules.map(({ name, size }) => `  ${name} (${size} bytes)`).join("\n")}

Exports assigned under a condition or through a computed key cannot be read statically. For more info visit https://webpack.js.org/guides/tree-shaking/`
		);

		this.name = "DynamicExportsWarning";
	}
}

module.exports = DynamicExportsWarning;
