/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/**
 * Whether an async module is lowered to a generator: the target has no
 * `async`/`await` but supports generators, and the module contains no
 * top-level `for await…of` (which generators can't express).
 * @param {Module} module module
 * @param {ModuleGraph} moduleGraph module graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @returns {boolean} true when the module should be emitted as a generator
 */
const isGeneratorLowered = (module, moduleGraph, runtimeTemplate) =>
	moduleGraph.isAsync(module) &&
	!runtimeTemplate.supportsAsyncFunction() &&
	Boolean(runtimeTemplate.supportsGenerator()) &&
	!(module.buildInfo && module.buildInfo.usesTopLevelAwaitForOf);

module.exports = isGeneratorLowered;
