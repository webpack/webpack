/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { AsyncParallelHook, AsyncSeriesBailHook, SyncHook } = require("tapable");

/** @typedef {(result: any, callback: (err?: Error) => void) => void} GotHandler */

const needCalls = (times, callback) => {
	return err => {
		if (--times === 0) {
			return callback(err);
		}
		if (err && times > 0) {
			times = NaN;
			return callback(err);
		}
	};
};

class Cache {
	constructor() {
		this.hooks = {
			/** @type {AsyncSeriesBailHook<[string, string, TODO[]], any>} */
			get: new AsyncSeriesBailHook(["identifier", "etag", "gotHandlers"]),
			/** @type {AsyncParallelHook<[string, string, any]>} */
			store: new AsyncParallelHook(["identifier", "etag", "data"]),
			/** @type {SyncHook<[]>} */
			beginIdle: new SyncHook([]),
			/** @type {AsyncParallelHook<[]>} */
			endIdle: new AsyncParallelHook([]),
			/** @type {AsyncParallelHook<[]>} */
			shutdown: new AsyncParallelHook([])
		};
	}

	get(identifier, etag, callback) {
		const gotHandlers = [];
		this.hooks.get.callAsync(identifier, etag, gotHandlers, (err, result) => {
			if (err) {
				callback(err);
				return;
			}
			if (gotHandlers.length > 1) {
				const innerCallback = needCalls(gotHandlers.length, () =>
					callback(null, result)
				);
				for (const gotHandler of gotHandlers) {
					gotHandler(result, innerCallback);
				}
			} else if (gotHandlers.length === 1) {
				gotHandlers[0](result, () => callback(null, result));
			} else {
				callback(null, result);
			}
		});
	}

	store(identifier, etag, data, callback) {
		this.hooks.store.callAsync(identifier, etag, data, callback);
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
