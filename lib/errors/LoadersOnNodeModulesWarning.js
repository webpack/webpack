/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} LoaderOnDependenciesDetails
 * @property {string} loader the loader, by request
 * @property {number} modules how many modules under 'node_modules' it ran on
 */

class LoadersOnNodeModulesWarning extends WebpackError {
	/**
	 * Creates an instance of LoadersOnNodeModulesWarning.
	 * @param {LoaderOnDependenciesDetails[]} loaders the loaders that ran on dependencies
	 * @param {number} total how many such modules there are in all
	 */
	constructor(loaders, total) {
		const list = loaders
			.map((it) => `\n  ${it.loader} (${it.modules} modules)`)
			.join("");

		super(
			`loaders on dependencies: ${total} modules under 'node_modules' were handed to a loader:${list}\nDependencies ship built, so running a loader over them costs build time for work already done — usually a rule that is missing 'exclude: /node_modules/'. Where a dependency really does need it, narrowing the rule to that package keeps the cost to it.\nFor more info visit https://webpack.js.org/configuration/module/#condition`
		);

		/** @type {string} */
		this.name = "LoadersOnNodeModulesWarning";
	}
}

module.exports = LoadersOnNodeModulesWarning;
