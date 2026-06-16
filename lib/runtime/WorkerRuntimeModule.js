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
		// node has no global `Worker`; obtain it from `worker_threads` via
		// `process.getBuiltinModule` (guarded for old node) without a static import
		// that would crash the browser side of a universal bundle.
		const nodeWorker = runtimeTemplate.optionalChaining(
			"process.getBuiltinModule",
			'("worker_threads").Worker'
		);
		return `${RuntimeGlobals.worker} = typeof Worker !== "undefined" ? Worker : typeof process !== "undefined" && ${nodeWorker};`;
	}
}

module.exports = WorkerRuntimeModule;
