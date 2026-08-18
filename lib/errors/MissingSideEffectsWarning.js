/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../WebpackError");

/** @typedef {{ name: string, modules: number, size: number }} MissingSideEffectsDetails */

class MissingSideEffectsWarning extends WebpackError {
	/**
	 * Creates an instance of MissingSideEffectsWarning.
	 * @param {MissingSideEffectsDetails[]} packages the packages to name, costliest first
	 * @param {number} total how many packages were found
	 * @param {number} wasted the bytes they keep in the bundle
	 */
	constructor(packages, total, wasted) {
		super(
			`missing sideEffects: ${total} ${total === 1 ? "package keeps" : "packages keep"} ${wasted} bytes of unused code because ${total === 1 ? "its" : "their"} package.json does not declare 'sideEffects':
${packages
	.map(
		({ name, modules, size }) =>
			`  ${name} (${size} bytes in ${modules} ${modules === 1 ? "module" : "modules"})`
	)
	.join("\n")}

Without the field webpack must assume every module runs code on import. For more info visit https://webpack.js.org/guides/tree-shaking/`
		);

		this.name = "MissingSideEffectsWarning";
	}
}

module.exports = MissingSideEffectsWarning;
