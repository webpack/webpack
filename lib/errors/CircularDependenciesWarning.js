/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} CircularDependencyDetails
 * @property {number} size how many modules can all reach each other
 * @property {string} cycle the shortest cycle through one of them
 */

class CircularDependenciesWarning extends WebpackError {
	/**
	 * Creates an instance of CircularDependenciesWarning.
	 * @param {CircularDependencyDetails[]} groups the largest groups, biggest first
	 * @param {number} total how many groups of modules import each other
	 */
	constructor(groups, total) {
		const list = groups
			.map((group) => `\n  ${group.size} modules: ${group.cycle}`)
			.join("");

		super(
			`circular dependencies: ${total} ${
				total === 1 ? "group of modules imports" : "groups of modules import"
			} each other synchronously, shortest cycle of each shown:${list}\nOne module of a cycle runs before the others finished, so it reads their exports as 'undefined' — or throws for a 'const' or 'class' export. Moving the shared part into a module both sides import breaks the cycle.`
		);

		/** @type {string} */
		this.name = "CircularDependenciesWarning";
	}
}

module.exports = CircularDependenciesWarning;
