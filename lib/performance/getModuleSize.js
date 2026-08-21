/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Module from "../Module" */

/**
 * Asks the module for its own source types rather than assuming javascript, so
 * a css or asset module counts too.
 * @param {Module} module a module
 * @returns {number} its size over every source type it reports
 */
const getModuleSize = (module) => {
	let size = 0;
	for (const type of module.getSourceTypes()) size += module.size(type);
	return size;
};

module.exports = getModuleSize;
