/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ConcatenatedModule = require("../optimize/ConcatenatedModule");

/** @import Module from "../Module" */

/**
 * Yields the modules a user wrote, looking through scope hoisting: a
 * concatenation is one module in the chunk graph but several on disk, and a
 * hint about bytes or duplication has to name the ones on disk.
 * @param {Module} module a module from the chunk graph
 * @returns {Iterable<Module>} the modules it was built from, or itself
 */
const getSourceModules = (module) =>
	module instanceof ConcatenatedModule ? module.modules : [module];

module.exports = getSourceModules;
