"use strict";

/** @import { Configuration } from "../../../../.." */

/**
 * @param {Configuration[]} options compiler options
 * @returns {RegExp[]} expected errors for each configuration
 */
module.exports = (options) =>
	options.map(() => /Can't resolve|Module parse failed/);
