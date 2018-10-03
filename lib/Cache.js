/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { AsyncParallelHook, AsyncSeriesBailHook, SyncHook } = require("tapable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Module")} Module */

class Cache {
	constructor() {
		this.hooks = {
			/** @type {AsyncSeriesBailHook<string>} */
			getModule: new AsyncSeriesBailHook(["identifier"]),
			/** @type {AsyncParallelHook<string, Module>} */
			storeModule: new AsyncParallelHook(["identifier", "module"]),
			/** @type {AsyncSeriesBailHook<string, string>} */
			getAsset: new AsyncSeriesBailHook(["identifier", "hash"]),
			/** @type {AsyncParallelHook<string, string, Source>} */
			storeAsset: new AsyncParallelHook(["identifier", "hash", "source"]),
			/** @type {SyncHook} */
			beginIdle: new SyncHook([]),
			/** @type {AsyncParallelHook} */
			endIdle: new AsyncParallelHook([]),
			/** @type {AsyncParallelHook} */
			shutdown: new AsyncParallelHook([])
		};
	}

	getModule(identifier, callback) {
		this.hooks.getModule.callAsync(identifier, callback);
	}

	storeModule(identifier, module, callback) {
		this.hooks.storeModule.callAsync(identifier, module, callback);
	}

	getAsset(identifier, hash, callback) {
		this.hooks.getAsset.callAsync(identifier, hash, callback);
	}

	storeAsset(identifier, hash, source, callback) {
		this.hooks.storeAsset.callAsync(identifier, hash, source, callback);
	}

	beginIdle() {
		this.hooks.beginIdle.call();
	}

	endIdle(callback) {
		this.hooks.endIdle.callAsync(callback);
	}

	shutdown(callback) {
		this.hooks.shutdown.callAsync(callback);
	}
}

module.exports = Cache;
