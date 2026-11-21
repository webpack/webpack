/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const WebpackError = require("../WebpackError");
const WorkerFarm = require("./WorkerFarm");
const WorkerPool = require("./WorkerPool");

/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "WorkerPlugin";

/**
 * Creates the compiler's worker farm when `experiments.threads` is on, and
 * warns on each compilation when the runtime cannot provide threads.
 */
class WorkerPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		if (WorkerPool.isThreadingAvailable()) {
			// The farm taps the build lifecycle; create it now so the first
			// build's `compile` keeps the threads alive. A plugin's `apply` may
			// have called `compiler.worker()` already.
			if (compiler._workerFarm === undefined) {
				compiler._workerFarm = new WorkerFarm(compiler);
			}
			return;
		}
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.warnings.push(
				new WebpackError(
					`experiments.threads is enabled, but worker_threads is unavailable in Node.js ${process.version}; compiler.worker() calls run on the main thread`
				)
			);
		});
	}
}

module.exports = WorkerPlugin;
