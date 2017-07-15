/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Watchpack = require("watchpack");

class NodeWatchFileSystem {
	constructor(inputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		this.watcherOptions = {
			aggregateTimeout: 0
		};
		this.watcher = new Watchpack(this.watcherOptions);
	}

	watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
		if(!Array.isArray(files))
			throw new Error("Invalid arguments: 'files'");
		if(!Array.isArray(dirs))
			throw new Error("Invalid arguments: 'dirs'");
		if(!Array.isArray(missing))
			throw new Error("Invalid arguments: 'missing'");
		if(typeof callback !== "function")
			throw new Error("Invalid arguments: 'callback'");
		if(typeof startTime !== "number" && startTime)
			throw new Error("Invalid arguments: 'startTime'");
		if(typeof options !== "object")
			throw new Error("Invalid arguments: 'options'");
		if(typeof callbackUndelayed !== "function" && callbackUndelayed)
			throw new Error("Invalid arguments: 'callbackUndelayed'");
		const oldWatcher = this.watcher;
		this.watcher = new Watchpack(options);

		if(callbackUndelayed)
			this.watcher.once("change", callbackUndelayed);

		this.watcher.once("aggregated", (changes, removals) => {
			changes = changes.concat(removals);
			if(this.inputFileSystem && this.inputFileSystem.purge) {
				this.inputFileSystem.purge(changes);
			}
			const times = this.watcher.getTimes();
			callback(null,
				changes.filter(file => files.indexOf(file) >= 0).sort(),
				changes.filter(file => dirs.indexOf(file) >= 0).sort(),
				changes.filter(file => missing.indexOf(file) >= 0).sort(), times, times);
		});

		this.watcher.watch(files.concat(missing), dirs.concat(missing), startTime);

		if(oldWatcher) {
			oldWatcher.close();
		}
		return {
			close: () => {
				if(this.watcher) {
					this.watcher.close();
					this.watcher = null;
				}
			},
			pause: () => {
				if(this.watcher) {
					this.watcher.pause();
				}
			}
		};
	}
}

module.exports = NodeWatchFileSystem;
