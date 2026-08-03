/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const WebpackError = require("../WebpackError");
const memoize = require("../util/memoize");
const {
	WorkerPool,
	isSupported,
	setWorkerPool
} = require("./ParallelLoaderWorkerPool");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../NormalModule").LoaderItem} LoaderItem */
/** @typedef {import("../../declarations/WebpackOptions").ParallelLoaderOptions} ParallelLoaderOptions */

const getNormalModule = memoize(() => require("../NormalModule"));

const PLUGIN_NAME = "ParallelLoaderPlugin";

const PARALLEL_LOADER_PATH = require.resolve("./ParallelLoader");

class ParallelLoaderPlugin {
	/**
	 * @param {ParallelLoaderOptions} options options
	 */
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		if (!isSupported()) {
			throw new WebpackError(
				"'experiments.parallel.loader' requires the 'worker_threads' module, which this runtime does not provide. It is available from Node.js 12 on."
			);
		}

		const pool = new WorkerPool(this.options);

		setWorkerPool(compiler, pool);

		compiler.hooks.shutdown.tapAsync(PLUGIN_NAME, (callback) => {
			pool.dispose().then(() => callback(), callback);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			getNormalModule()
				.getCompilationHooks(compilation)
				.beforeLoaders.tap(
					PLUGIN_NAME,
					/**
					 * @param {LoaderItem[]} loaders the module's loaders
					 * @returns {void}
					 */
					(loaders) => {
						// nothing to move off the main thread
						if (loaders.length === 0) return;
						// the chain may already carry a hand-placed parallel loader, which
						// splits it deliberately; injecting a second one would nest pools
						for (const loader of loaders) {
							if (loader.loader === PARALLEL_LOADER_PATH) return;
						}
						loaders.unshift({
							loader: PARALLEL_LOADER_PATH,
							options: undefined,
							ident: undefined,
							type: undefined
						});
					}
				);
		});
	}
}

module.exports = ParallelLoaderPlugin;
