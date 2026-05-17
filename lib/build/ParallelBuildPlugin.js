/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const path = require("path");
const { getPool } = require("../worker/workerPools");

/** @typedef {import("../Compiler")} Compiler */

const WORKER_PATH = path.resolve(__dirname, "moduleBuildWorker.js");

class ParallelBuildPlugin {
	/**
	 * @param {object=} options plugin options
	 * @param {number=} options.workers number of worker threads
	 */
	constructor(options) {
		const opts = options || {};
		/** @type {number | undefined} */
		this.numberOfWorkers = opts.workers;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 */
	apply(compiler) {
		const pool = getPool(WORKER_PATH, {
			numberOfWorkers: this.numberOfWorkers
		});

		pool.warmup({});

		compiler._parallelBuildPool = pool;

		compiler.hooks.shutdown.tap("ParallelBuildPlugin", () => {
			compiler._parallelBuildPool = undefined;
		});
	}
}

module.exports = ParallelBuildPlugin;
