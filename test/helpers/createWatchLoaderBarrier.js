"use strict";

const assert = require("assert");
const { NormalModule } = require("../..");

/** @import { Compiler, LoaderContext } from "../../" */
/** @typedef {(error: Error | null, source?: string) => void} LoaderCallback */
/** @typedef {LoaderContext<Record<string, never>> & { watchTestBarrier?: (source: string, callback: LoaderCallback) => void }} BarrierLoaderContext */

/**
 * Pauses the next watch loader after it has read its source.
 * @returns {{ plugin: (compiler: Compiler) => void, arm: () => Promise<void>, release: () => void }} loader barrier
 */
const createWatchLoaderBarrier = () => {
	/** @type {(() => void) | undefined} */
	let reached;
	/** @type {(() => void) | undefined} */
	let resume;
	return {
		/**
		 * @param {Compiler} compiler watched compiler
		 * @returns {void}
		 */
		plugin(compiler) {
			compiler.hooks.compilation.tap("WatchLoaderBarrier", (compilation) => {
				if (!compiler.watchMode) return;
				NormalModule.getCompilationHooks(compilation).loader.tap(
					"WatchLoaderBarrier",
					(loaderContext) => {
						/** @type {BarrierLoaderContext} */ (
							loaderContext
						).watchTestBarrier = (source, callback) => {
							if (!reached) return callback(null, source);
							resume = () => callback(null, source);
							const notify = reached;
							reached = undefined;
							notify();
						};
					}
				);
			});
		},
		/**
		 * @returns {Promise<void>} resolves when the next loader is paused
		 */
		arm() {
			assert(!reached && !resume, "A loader barrier is already armed");
			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reached = undefined;
					reject(new Error("Timed out waiting for the watch loader"));
				}, 10000);
				reached = () => {
					clearTimeout(timeout);
					resolve();
				};
			});
		},
		/**
		 * @returns {void}
		 */
		release() {
			const callback = resume;
			resume = undefined;
			if (callback) callback();
		}
	};
};

module.exports = createWatchLoaderBarrier;
