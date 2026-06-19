/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class WorkerRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("worker");
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
