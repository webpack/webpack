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
		const nodeWorker = runtimeTemplate.getBuiltinModule(
			runtimeTemplate.renderNodePrefixForCoreModule("worker_threads"),
			".Worker"
		);
		const { platform } = compilation.compiler;
		// pure-node targets must use `worker_threads.Worker`; a leaked global `Worker`
		// (Deno/Bun) is a web Worker lacking the node `.on` API. web/universal prefer the global.
		return platform.node && !platform.web
			? `${RuntimeGlobals.worker} = ${nodeWorker} || (typeof Worker !== "undefined" && Worker);`
			: `${RuntimeGlobals.worker} = typeof Worker !== "undefined" ? Worker : ${nodeWorker};`;
	}
}

module.exports = WorkerRuntimeModule;
