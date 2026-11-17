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
			// A plugin's `apply` may have called `compiler.worker()` already.
			const farm = compiler._workerFarm || new WorkerFarm(compiler);
			compiler._workerFarm = farm;
			// WHY: a build hands its threads from loaders to minimizers with idle
			// gaps between (seal can outlast an idle timeout), and a watch rebuild
			// may come minutes later; spawning a thread costs far more than a call.
			compiler.hooks.compile.tap(PLUGIN_NAME, () => farm.startBuild());
			const endBuild = () => farm.endBuild(compiler.watchMode);
			compiler.hooks.done.tap(PLUGIN_NAME, endBuild);
			compiler.hooks.failed.tap(PLUGIN_NAME, endBuild);
			compiler.hooks.watchClose.tap(PLUGIN_NAME, () =>
				farm.setKeepAlive(false)
			);
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
