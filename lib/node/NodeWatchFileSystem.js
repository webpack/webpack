/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");
var async = require("async");

function NodeWatchFileSystem(inputFileSystem) {
	this.inputFileSystem = inputFileSystem;
}
module.exports = NodeWatchFileSystem;

/**
 *
 * @param files {String[]} a sorted array of paths to files
 * @param dirs {String[]} a sorted array of paths to directories
 * @param startTime {number} the virtual start time
 * @param delay {number} in ms, the time to wait to signal after the first change
 * @param callback {function(err, filesModified: String[], dirsModified: String[], fileTimestamps: Object, dirTimestamps: Object)] called once after change plus delay
 * @param callbackUndelayed {function()} called once after first change
 */
NodeWatchFileSystem.prototype.watch = function(files, dirs, startTime, delay, callback, callbackUndelayed) {
	var inputFileSystem = this.inputFileSystem;

	if(!callbackUndelayed) callbackUndelayed = function() {}
	var closed = false;
	var fileTimestamps = {};
	var dirTimestamps = {};
	var filesModified = {};
	var dirsModified = {};

	var lastChangeTime;

	startTime = Math.floor(startTime / 1000) * 1000; // only 1 second accuracy

	var directories = {};
	dirs.forEach(function(dir) {
		directories[dir] = {
			context: dir,
			files: []
		};
	});
	files.forEach(function(file) {
		var dir = path.dirname(file);
		if(!directories[dir]) directories[dir] = {
			files: []
		};
		directories[dir].files.push(file);
	});

	var items = Object.keys(directories).map(function(dir) {
		directories[dir].path = dir;
		return directories[dir];
	});
	items.sort(function(a,b) {
		if(a.path === b.path) return 0;
		return a.path < b.path ? -1 : 1;
	});
	items.forEach(function(item) {
		if(item.files) {
			item.files.sort();
		}
	});

	var initialChange = false;
	var change = function(path) {
		initialChange = true;
	}

	function readStat(item, callback) {
		if(item.context) {
			fs.readdir(item.path, function(err, files) {
				function onTimestamp(ts) {
					if(!dirTimestamps[item.context] || dirTimestamps[item.context] < ts)
						dirTimestamps[item.context] = ts;
					if(ts >= startTime) {
						dirsModified[item.context] = true;
						change(item.path);
					}
					return callback();
				}
				if(err) return onTimestamp(Infinity);
				async.map(files, function(file, callback) {
					file = path.join(item.path, file);
					var isFile = false;
					if(item.files) {
						if(binarySearch(item.files, function(path) {
							if(path === file) return 0;
							return path < file ? -1 : 1;
						}) >= 0) {
							isFile = true;
						}
					}
					fs.stat(file, function(err, stat) {
						var ts = err ? Infinity : stat.mtime.getTime();
						if(isFile) {
							fileTimestamps[file] = ts;
							if(ts >= startTime) filesModified[file] = true;
						}
						return callback(null, ts);
					});
				}, function(err, timestamps) {
					if(err) return onTimestamp(Infinity);
					var ts = timestamps.reduce(function(max, ts) {
						if(ts > max)
							return ts;
						return max;
					}, 0);
					onTimestamp(ts);
				});
			});
		} else {
			async.forEach(item.files, function(file, callback) {
				fs.stat(file, function(err, stat) {
					var ts = err ? Infinity : stat.mtime.getTime();
					fileTimestamps[file] = ts;
					if(ts >= startTime) {
						filesModified[file] = true;
						change(file);
					}
					return callback(null, ts);
				});
			}, callback);
		}
	}
	async.forEach(items, function processItem(item, callback) {
		var isRunning = false;
		var isScheduled = false;
		item.watcher = fs.watch(item.path, function() {
			if(isRunning) return isScheduled = true;
			isRunning = true;
			readStat(item, done);
		});
		if(item.context) {
			item.children = [];
			fs.readdir(item.path, function(err, files) {
				if(err) return change(file), onWatcherApplied();
				async.forEach(files, function(file, callback) {
					file = path.join(item.path, file);
					fs.stat(file, function(err, stat) {
						if(err) return change(file), callback();
						if(!stat.isDirectory()) return callback();
						var subitem = {
							path: file,
							context: item.context
						};
						item.children.push(subitem);
						processItem(subitem, callback);
					});
				}, onWatcherApplied);
			});
		} else onWatcherApplied();
		function onWatcherApplied() {
			readStat(item, function() {
				callback();
				done();
			});
		}
		function done() {
			if(closed) return;
			if(isScheduled) {
				isScheduled = false;
				readStat(item, done);
			} else {
				isRunning = false;
			}
		}
	}, function() {
		var timeout;
		if(initialChange) {

			callbackUndelayed();
			if(delay) {
				lastChangeTime = Date.now();
				change = restartDelay;
				timeout = setTimeout(onTimeout, delay);
			} else onTimeout();

		} else {

			change = function(path) {

				callbackUndelayed();
				if(delay) {
					lastChangeTime = Date.now();
					change = restartDelay;
					timeout = setTimeout(onTimeout, delay);
				} else {
					change = function() {};
					onTimeout();
				}
			};

		}

		function restartDelay() {
			lastChangeTime = Date.now();
			clearTimeout(timeout);
			timeout = setTimeout(onTimeout, delay);
		}

	});

	// 7.
	function onTimeout() {
		var nextSecond = Math.ceil(lastChangeTime / 1000) * 1000;
		var timeToNextSecond = nextSecond - Date.now();
		if(timeToNextSecond > 0) {
			setTimeout(onTimeout, timeToNextSecond);
			return;
		}
		change = function() {};
		if(closed) return;
		var outdatedFiles = Object.keys(filesModified).sort();
		var outdatedDirs = Object.keys(dirsModified).sort();
		if(inputFileSystem && inputFileSystem.purge) {
			inputFileSystem.purge(outdatedFiles);
			inputFileSystem.purge(outdatedDirs);
		}
		callback(null, outdatedFiles, outdatedDirs, fileTimestamps, dirTimestamps);

		close();
	}

	function close() {
		closed = true;
		items.forEach(function closeItem(item) {
			item.watcher.close();
			if(item.children) item.children.forEach(closeItem);
		});
	}

	return {
		close: close
	}
};

function binarySearch(array, comparator) {
	var left = 0;
	var right = array.length - 1;

	while(left <= right) {
		var middle = ((left + right)/2)|0;
		var comp = comparator(array[middle]);
		if(comp === 0) return middle;
		if(comp > 0) right = middle-1;
		if(comp < 0) left = middle+1;
	}
	return -1;
}
