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
 * Sets up the compiler's worker farm when `experiments.threads` is on, and
 * warns on each compilation when the runtime cannot provide threads.
 */
class WorkerPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		if (WorkerPool.isThreadingAvailable()) {
			compiler._workerFarm = new WorkerFarm(compiler);
			return;
		}
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.warnings.push(
				new WebpackError(
					`experiments.threads is enabled, but worker_threads is unavailable in Node.js ${process.version}; compiler.worker() throws and loader chains run on the main thread`
				)
			);
		});
	}
}

module.exports = WorkerPlugin;
