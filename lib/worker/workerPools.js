/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Based on thread-loader workerPools by @sokra
*/

"use strict";

const WorkerPool = require("./WorkerPool");

/** @type {Map<string, WorkerPool>} */
const pools = new Map();

/**
 * Get or create a shared worker pool for the given worker script and options.
 * Pools with identical configuration are reused across compilers.
 * @param {string} workerPath absolute path to the worker script
 * @param {import("./WorkerPool").WorkerPoolOptions=} options pool options
 * @returns {WorkerPool} shared pool
 */
module.exports.getPool = (workerPath, options) => {
	const key = `${workerPath}|${JSON.stringify(options || {})}`;
	let pool = pools.get(key);
	if (!pool || pool.terminated) {
		pool = new WorkerPool(workerPath, options);
		pools.set(key, pool);
	}
	return pool;
};

/**
 * Terminate all shared pools. Called on process exit.
 */
module.exports.terminateAll = () => {
	for (const pool of pools.values()) {
		pool.terminate();
	}
	pools.clear();
};

// Clean up on process exit
process.on("exit", () => {
	module.exports.terminateAll();
});
