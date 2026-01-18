/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * Webpack Global Variables and Runtime Globals
 * 
 * This module exports webpack's internal global variables that are injected
 * into bundles at runtime. These globals are used internally by webpack's
 * runtime to manage module loading, code splitting, hot module replacement,
 * and other runtime operations.
 * 
 * @example
 * import * as webpackGlobals from "webpack/globals";
 * 
 * // Access specific globals
 * const publicPath = webpackGlobals.publicPath;
 * const requireFn = webpackGlobals.require;
 */

const RuntimeGlobals = require("./RuntimeGlobals");

module.exports = RuntimeGlobals;
