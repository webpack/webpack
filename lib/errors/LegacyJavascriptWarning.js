/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} LegacyPackageDetails
 * @property {string} name the package doing the emulating
 * @property {number} modules how many of its modules are in the build
 * @property {number} size bytes they contribute
 */

class LegacyJavascriptWarning extends WebpackError {
	/**
	 * Creates an instance of LegacyJavascriptWarning.
	 * @param {LegacyPackageDetails[]} packages the ones found, largest first
	 * @param {number} totalSize bytes they contribute between them
	 * @param {string[]} features the ones the target already has
	 */
	constructor(packages, totalSize, features) {
		const list = packages
			.map(
				(item) =>
					`\n  ${item.name} (${item.modules} ${
						item.modules === 1 ? "module" : "modules"
					}, ${formatSize(item.size)})`
			)
			.join("");

		super(
			`legacy javascript: ${formatSize(
				totalSize
			)} of the build emulates syntax the target already has natively:${list}\n'output.environment' says this target supports ${features.join(
				", "
			)}, so whatever lowers the syntax — usually '@babel/preset-env' — is compiling for older browsers than webpack is. Lining its targets up with the browserslist webpack reads drops them.\nFor more info visit https://webpack.js.org/configuration/target/#browserslist`
		);

		/** @type {string} */
		this.name = "LegacyJavascriptWarning";
	}
}

module.exports = LegacyJavascriptWarning;
