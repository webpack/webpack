/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class WorkerRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("worker");
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
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		// prefer a global `Worker` when present (web, Bun, polyfills), else `worker_threads.Worker`
		const nodeWorker = runtimeTemplate.getBuiltinModule(
			runtimeTemplate.renderNodePrefixForCoreModule("worker_threads"),
			".Worker"
		);
		return `${RuntimeGlobals.worker} = typeof Worker !== "undefined" ? Worker : ${nodeWorker};`;
	}
}

module.exports = WorkerRuntimeModule;
