/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const getWatcherManager = require("./getWatcherManager");
const LinkResolver = require("./LinkResolver");
const EventEmitter = require("events").EventEmitter;
const globToRegExp = require("glob-to-regexp");
const watchEventSource = require("./watchEventSource");

const EMPTY_ARRAY = [];
const EMPTY_OPTIONS = {};

function addWatchersToSet(watchers, set) {
	for (const ww of watchers) {
		const w = ww.watcher;
		if (!set.has(w.directoryWatcher)) {
			set.add(w.directoryWatcher);
		}
	}
}

const stringToRegexp = ignored => {
	if (ignored.length === 0) {
		return;
	}
	const source = globToRegExp(ignored, { globstar: true, extended: true })
		.source;
	return source.slice(0, source.length - 1) + "(?:$|\\/)";
};

const ignoredToFunction = ignored => {
	if (Array.isArray(ignored)) {
		const stringRegexps = ignored.map(i => stringToRegexp(i)).filter(Boolean);
		if (stringRegexps.length === 0) {
			return () => false;
		}
		const regexp = new RegExp(stringRegexps.join("|"));
		return x => regexp.test(x.replace(/\\/g, "/"));
	} else if (typeof ignored === "string") {
		const stringRegexp = stringToRegexp(ignored);
		if (!stringRegexp) {
			return () => false;
		}
		const regexp = new RegExp(stringRegexp);
		return x => regexp.test(x.replace(/\\/g, "/"));
	} else if (ignored instanceof RegExp) {
		return x => ignored.test(x.replace(/\\/g, "/"));
	} else if (ignored instanceof Function) {
		return ignored;
	} else if (ignored) {
		throw new Error(`Invalid option for 'ignored': ${ignored}`);
	} else {
		return () => false;
	}
};

const normalizeOptions = options => {
	return {
		followSymlinks: !!options.followSymlinks,
		ignored: ignoredToFunction(options.ignored),
		poll: options.poll
	};
};

const normalizeCache = new WeakMap();
const cachedNormalizeOptions = options => {
	const cacheEntry = normalizeCache.get(options);
	if (cacheEntry !== undefined) return cacheEntry;
	const normalized = normalizeOptions(options);
	normalizeCache.set(options, normalized);
	return normalized;
};

class WatchpackFileWatcher {
	constructor(watchpack, watcher, files) {
		this.files = Array.isArray(files) ? files : [files];
		this.watcher = watcher;
		watcher.on("initial-missing", type => {
			for (const file of this.files) {
				if (!watchpack._missing.has(file))
					watchpack._onRemove(file, file, type);
			}
		});
		watcher.on("change", (mtime, type) => {
			for (const file of this.files) {
				watchpack._onChange(file, mtime, file, type);
			}
		});
		watcher.on("remove", type => {
			for (const file of this.files) {
				watchpack._onRemove(file, file, type);
			}
		});
	}

	update(files) {
		if (!Array.isArray(files)) {
			if (this.files.length !== 1) {
				this.files = [files];
			} else if (this.files[0] !== files) {
				this.files[0] = files;
			}
		} else {
			this.files = files;
		}
	}

	close() {
		this.watcher.close();
	}
}

class WatchpackDirectoryWatcher {
	constructor(watchpack, watcher, directories) {
		this.directories = Array.isArray(directories) ? directories : [directories];
		this.watcher = watcher;
		watcher.on("initial-missing", type => {
			for (const item of this.directories) {
				watchpack._onRemove(item, item, type);
			}
		});
		watcher.on("change", (file, mtime, type) => {
			for (const item of this.directories) {
				watchpack._onChange(item, mtime, file, type);
			}
		});
		watcher.on("remove", type => {
			for (const item of this.directories) {
				watchpack._onRemove(item, item, type);
			}
		});
	}

	update(directories) {
		if (!Array.isArray(directories)) {
			if (this.directories.length !== 1) {
				this.directories = [directories];
			} else if (this.directories[0] !== directories) {
				this.directories[0] = directories;
			}
		} else {
			this.directories = directories;
		}
	}

	close() {
		this.watcher.close();
	}
}

class Watchpack extends EventEmitter {
	constructor(options) {
		super();
		if (!options) options = EMPTY_OPTIONS;
		this.options = options;
		this.aggregateTimeout =
			typeof options.aggregateTimeout === "number"
				? options.aggregateTimeout
				: 200;
		this.watcherOptions = cachedNormalizeOptions(options);
		this.watcherManager = getWatcherManager(this.watcherOptions);
		this.fileWatchers = new Map();
		this.directoryWatchers = new Map();
		this._missing = new Set();
		this.startTime = undefined;
		this.paused = false;
		this.aggregatedChanges = new Set();
		this.aggregatedRemovals = new Set();
		this.aggregateTimer = undefined;
		this._onTimeout = this._onTimeout.bind(this);
	}

	watch(arg1, arg2, arg3) {
		let files, directories, missing, startTime;
		if (!arg2) {
			({
				files = EMPTY_ARRAY,
				directories = EMPTY_ARRAY,
				missing = EMPTY_ARRAY,
				startTime
			} = arg1);
		} else {
			files = arg1;
			directories = arg2;
			missing = EMPTY_ARRAY;
			startTime = arg3;
		}
		this.paused = false;
		const fileWatchers = this.fileWatchers;
		const directoryWatchers = this.directoryWatchers;
		const ignored = this.watcherOptions.ignored;
		const filter = path => !ignored(path);
		const addToMap = (map, key, item) => {
			const list = map.get(key);
			if (list === undefined) {
				map.set(key, item);
			} else if (Array.isArray(list)) {
				list.push(item);
			} else {
				map.set(key, [list, item]);
			}
		};
		const fileWatchersNeeded = new Map();
		const directoryWatchersNeeded = new Map();
		const missingFiles = new Set();
		if (this.watcherOptions.followSymlinks) {
			const resolver = new LinkResolver();
			for (const file of files) {
				if (filter(file)) {
					for (const innerFile of resolver.resolve(file)) {
						if (file === innerFile || filter(innerFile)) {
							addToMap(fileWatchersNeeded, innerFile, file);
						}
					}
				}
			}
			for (const file of missing) {
				if (filter(file)) {
					for (const innerFile of resolver.resolve(file)) {
						if (file === innerFile || filter(innerFile)) {
							missingFiles.add(file);
							addToMap(fileWatchersNeeded, innerFile, file);
						}
					}
				}
			}
			for (const dir of directories) {
				if (filter(dir)) {
					let first = true;
					for (const innerItem of resolver.resolve(dir)) {
						if (filter(innerItem)) {
							addToMap(
								first ? directoryWatchersNeeded : fileWatchersNeeded,
								innerItem,
								dir
							);
						}
						first = false;
					}
				}
			}
		} else {
			for (const file of files) {
				if (filter(file)) {
					addToMap(fileWatchersNeeded, file, file);
				}
			}
			for (const file of missing) {
				if (filter(file)) {
					missingFiles.add(file);
					addToMap(fileWatchersNeeded, file, file);
				}
			}
			for (const dir of directories) {
				if (filter(dir)) {
					addToMap(directoryWatchersNeeded, dir, dir);
				}
			}
		}
		// Close unneeded old watchers
		// and update existing watchers
		for (const [key, w] of fileWatchers) {
			const needed = fileWatchersNeeded.get(key);
			if (needed === undefined) {
				w.close();
				fileWatchers.delete(key);
			} else {
				w.update(needed);
				fileWatchersNeeded.delete(key);
			}
		}
		for (const [key, w] of directoryWatchers) {
			const needed = directoryWatchersNeeded.get(key);
			if (needed === undefined) {
				w.close();
				directoryWatchers.delete(key);
			} else {
				w.update(needed);
				directoryWatchersNeeded.delete(key);
			}
		}
		// Create new watchers and install handlers on these watchers
		watchEventSource.batch(() => {
			for (const [key, files] of fileWatchersNeeded) {
				const watcher = this.watcherManager.watchFile(key, startTime);
				if (watcher) {
					fileWatchers.set(key, new WatchpackFileWatcher(this, watcher, files));
				}
			}
			for (const [key, directories] of directoryWatchersNeeded) {
				const watcher = this.watcherManager.watchDirectory(key, startTime);
				if (watcher) {
					directoryWatchers.set(
						key,
						new WatchpackDirectoryWatcher(this, watcher, directories)
					);
				}
			}
		});
		this._missing = missingFiles;
		this.startTime = startTime;
	}

	close() {
		this.paused = true;
		if (this.aggregateTimer) clearTimeout(this.aggregateTimer);
		for (const w of this.fileWatchers.values()) w.close();
		for (const w of this.directoryWatchers.values()) w.close();
		this.fileWatchers.clear();
		this.directoryWatchers.clear();
	}

	pause() {
		this.paused = true;
		if (this.aggregateTimer) clearTimeout(this.aggregateTimer);
	}

	getTimes() {
		const directoryWatchers = new Set();
		addWatchersToSet(this.fileWatchers.values(), directoryWatchers);
		addWatchersToSet(this.directoryWatchers.values(), directoryWatchers);
		const obj = Object.create(null);
		for (const w of directoryWatchers) {
			const times = w.getTimes();
			for (const file of Object.keys(times)) obj[file] = times[file];
		}
		return obj;
	}

	getTimeInfoEntries() {
		const map = new Map();
		this.collectTimeInfoEntries(map, map);
		return map;
	}

	collectTimeInfoEntries(fileTimestamps, directoryTimestamps) {
		const allWatchers = new Set();
		addWatchersToSet(this.fileWatchers.values(), allWatchers);
		addWatchersToSet(this.directoryWatchers.values(), allWatchers);
		const safeTime = { value: 0 };
		for (const w of allWatchers) {
			w.collectTimeInfoEntries(fileTimestamps, directoryTimestamps, safeTime);
		}
	}

	getAggregated() {
		if (this.aggregateTimer) {
			clearTimeout(this.aggregateTimer);
			this.aggregateTimer = undefined;
		}
		const changes = this.aggregatedChanges;
		const removals = this.aggregatedRemovals;
		this.aggregatedChanges = new Set();
		this.aggregatedRemovals = new Set();
		return { changes, removals };
	}

	_onChange(item, mtime, file, type) {
		file = file || item;
		if (!this.paused) {
			this.emit("change", file, mtime, type);
			if (this.aggregateTimer) clearTimeout(this.aggregateTimer);
			this.aggregateTimer = setTimeout(this._onTimeout, this.aggregateTimeout);
		}
		this.aggregatedRemovals.delete(item);
		this.aggregatedChanges.add(item);
	}

	_onRemove(item, file, type) {
		file = file || item;
		if (!this.paused) {
			this.emit("remove", file, type);
			if (this.aggregateTimer) clearTimeout(this.aggregateTimer);
			this.aggregateTimer = setTimeout(this._onTimeout, this.aggregateTimeout);
		}
		this.aggregatedChanges.delete(item);
		this.aggregatedRemovals.add(item);
	}

	_onTimeout() {
		this.aggregateTimer = undefined;
		const changes = this.aggregatedChanges;
		const removals = this.aggregatedRemovals;
		this.aggregatedChanges = new Set();
		this.aggregatedRemovals = new Set();
		this.emit("aggregated", changes, removals);
	}
}

module.exports = Watchpack;
