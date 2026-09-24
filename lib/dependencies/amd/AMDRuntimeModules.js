/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const RuntimeModule = require("../../runtime/RuntimeModule");
const Template = require("../../template/Template");

/** @import { AmdOptions } from "./AMDPlugin" */

class AMDDefineRuntimeModule extends RuntimeModule {
	constructor() {
		super("amd define");
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.amdDefine} = function () {`,
			Template.indent("throw new Error('define cannot be used indirect');"),
			"};"
		]);
	}
}

class AMDOptionsRuntimeModule extends RuntimeModule {
	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Creates an instance of AMDOptionsRuntimeModule.
	 * @param {AmdOptions} options the AMD options
	 */
	constructor(options) {
		super("amd options");
		this.options = options;
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.amdOptions} = ${JSON.stringify(this.options)};`
		]);
	}
}

module.exports.AMDDefineRuntimeModule = AMDDefineRuntimeModule;
module.exports.AMDOptionsRuntimeModule = AMDOptionsRuntimeModule;
