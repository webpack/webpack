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

/*

1. merge files into context

2. merge paths by common part

	Sorted list of paths

	/home/a
	/home/dir/a
	/home/dir/b
	/home/dir/bdir/x
	/home/dir/bdir/y
	/home/dir/subdir/c
	/home/dir/subdir/d
	/home/dir/subdir/e
	/home/z
	/guu

	=> find common part in between elements

	2
	3
	3
	4
	3
	4
	4
	2
	1

	=> find longest line of max element

	2
	3
	3
	4
	3
	4 x
	4 x
	2
	1

	=> get paths

	/home/dir/subdir/c
	/home/dir/subdir/d
	/home/dir/subdir/e

	=> merge them by common part

	/home/dir/subdir {c,d,e}

	=> go on until max path count reached.

3. install watchers

4. read timestamp

5. on change: compare mtime to startTime

	get mtime of directory by reading all files and max mtime

	update new timestamps in timestampObject

6. start timeout on first change, but continue updating timestamps

7. on timeout: call handler and close watchers, abort async processes

*/

/**
 *
 * @param files {String[]} a sorted array of paths to files
 * @param dirs {String[]} a sorted array of paths to directories
 * @param startTime {number} the virtual start time
 * @param delay {number} in ms, the time to wait to signal after the first change
 * @param callback {function(err, filesModified: String[], dirModified: String[], fileTimestamps: Object, dirTimestamps: Object)] called once after change plus delay
 * @param callbackUndelayed {function()} called once after first change
 */
NodeWatchFileSystem.prototype.watch = function(files, dirs, startTime, delay, callback, callbackUndelayed) {
	var inputFileSystem = this.inputFileSystem;

	if(!callbackUndelayed) callbackUndelayed = function() {}
	var closed = false;
	var fileTimestamps = {};
	var dirTimestamps = {};

	var items = dirs.map(function(path) {
		return {
			type: 2,
			path: path,
			children: null
		}
	}).concat(files.map(function(path) {
		return {
			type: 1,
			path: path,
			children: null
		}
	}));
	items.sort(function(a,b) {
		if(a.path == b.path) return 0;
		return a.path < b.path ? -1 : 1;
	});
	
	// 1.
	

	// 2.
	while(items.length > 100)
		mergeCommonParts(items);

	// 3.
	var initialChange = false;
	var change = function() {
		initialChange = true;
	}

	function readStat(item, callback) {
		if(item.type == 1) { // file
			fs.stat(item.path, function(err, stat) {
				var ts = err ? Infinity : stat.mtime.getTime();
				fileTimestamps[item.path] = ts;
				if(ts >= startTime) {
					item.dirty = true;
					change();
				}
				callback(ts);
			});
		} else {
			fs.readdir(item.path, function(err, files) {
				if(err) {
					item.dirty = true;
					if(item.type == 2) dirTimestamps[item.path] = Infinity;
					change();
					return callback(Infinity);
				}
				traverse(item.path, files, function(ts) {
					if(item.type == 2) dirTimestamps[item.path] = ts;
					if(ts >= startTime) {
						item.dirty = true;
						change();
					}
					return callback(ts);
				});
			});
			function flagAllDirty(item) {
				if(item.children) {
					item.children.forEach(function(i) {
						i.dirty = true;
						if(i.type == 1) fileTimestamps[i.path] = Infinity;
						else if(i.type == 2) dirTimestamps[i.path] = Infinity;
					});
				}
			}
			function traverse(basePath, files, callback) {
				async.map(files, function(file, callback) {
					var thisPath = path.join(basePath, file);
					fs.stat(thisPath, function(err, stat) {
						if(err) {
							// on error flag all files dirty
							flagAllDirty(item);
							return callback(null, Infinity);
						}
						var idx = item.children ? binarySearch(item.children, function(item) {
							if(item.path == thisPath) return 0;
							return item.path > thisPath ? -1 : 1;
						}) : -1;
						if(idx >= 0) {
							var childItem = item.children[idx];
							if(childItem.type == 1) { 
								// file
								var ts = stat.mtime.getTime();
								fileTimestamps[childItem.path] = ts;
								if(ts >= startTime) {
									childItem.dirty = true;
								}
								return callback(null, ts);
							} else {
								// directory
								fs.readdir(thisPath, function(err, files) {
									if(err) {
										// on error flag all files dirty
										flagAllDirty(item);
										return callback(null, Infinity);
									}
									traverse(thisPath, files, function(ts) {
										dirTimestamps[childItem.path] = ts;
										if(ts >= startTime) {
											childItem.dirty = true;
										}
										return callback(null, ts);
									});
								});
							}
						} else {
							if(stat.isFile()) {
								return callback(null, stat.mtime.getTime());
							} else if(stat.isDirectory()) {
								fs.readdir(thisPath, function(err, files) {
									if(err) {
										// on error flag all files dirty
										flagAllDirty(item);
										return callback(null, Infinity);
									}
									traverse(thisPath, files, function(ts) {
										return callback(null, ts);
									});
								});
							} else {
								// ignore other stuff
								return callback(null, 0);
							}
						}
					});
				}, function(err, timestamps) {
					var ts = timestamps ? timestamps.reduce(function(a,b) { return Math.max(a,b); }, 0) : 0;
					return callback(ts);
				});
			}
		}
	}
	async.forEach(items, function(item, callback) {
		var isRunning = false;
		var isScheduled = false;
		item.watcher = fs.watch(item.path, function() {
			if(isRunning) return isScheduled = true;
			isRunning = true;
			readStat(item, done);
		});
		readStat(item, function(time) {
			callback();
			done();
		});
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
		if(initialChange) {

			// 6.
			callbackUndelayed();
			setTimeout(onTimeout, delay);

		} else {

			change = function() {
				
				// 6.
				change = function() {};
				callbackUndelayed();
				setTimeout(onTimeout, delay);
			};

		}

	});

	// 7.
	function onTimeout() {
		if(closed) return;
		if(inputFileSystem && inputFileSystem.purge) inputFileSystem.purge();
		callback(null, [], [], fileTimestamps, dirTimestamps);
		
		close();
	}
	
	function close() {
		closed = true;
		items.forEach(function(item) {
			item.watcher.close();
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
		if(comp == 0) return middle;
		if(comp > 0) right = middle-1;
		if(comp < 0) left = middle+1;
	}
	return -1;
}

function mergeCommonParts(items) {
	var maxCount = 1;
	var maxLength = 0;
	var maxLengthCommonPart = "";
	var maxLengthStart = -1;
	var currentLength = 1;
	for(var i = 1; i < items.length; i++) {
		var a = items[i-1].path;
		var b = items[i].path;
		var countChars = 0;
		var commonPart = 0;
		var count = 0;
		for(var j = 0; j < a.length && j < b.length; j++) {
			if(a[j] != b[j]) break;
			if(a[j] == "/" || a[j] == "\\") {
				count++;
				commonPart = countChars;
			}
			countChars++;
		}
		if(maxCount < count) {
			maxCount = count;
			maxLength = 0;
			currentLength = 1;
		}
		if(count == maxCount) {
			currentLength++;
			if(maxLength < currentLength) {
				maxLength = currentLength;
				maxLengthStart = i - currentLength + 1;
				maxLengthCommonPart = a.substr(0, commonPart);
			}
		} else {
			currentLength = 1;
		}
	}
	if(maxLengthCommonPart == "") return false;
	var newItem = {
		type: 0,
		path: maxLengthCommonPart,
		children: []
	}
	for(var i = maxLengthStart; i < maxLengthStart + maxLength; i++) {
		var item = items[i];
		if(item.children) item.children.forEach(function(child) {
			newItem.children.push(child);
		});
		item.children = null;
		newItem.children.push(item);
	}
	newItem.children.sort(function(a,b) {
		if(a.path == b.path) return 0;
		return a.path < b.path ? -1 : 1;
	});
	items.splice(maxLengthStart, maxLength, newItem);
}
