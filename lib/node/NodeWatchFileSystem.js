/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Watchpack = require("watchpack");

function NodeWatchFileSystem(inputFileSystem) {
	this.inputFileSystem = inputFileSystem;
	this.watcherOptions = {
		aggregateTimeout: 0
	};
	this.watcher = new Watchpack(this.watcherOptions);
}

module.exports = NodeWatchFileSystem;

NodeWatchFileSystem.prototype.watch = function watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
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
	var oldWatcher = this.watcher;
	this.watcher = new Watchpack(options);

	if(callbackUndelayed)
		this.watcher.once("change", callbackUndelayed);

	this.watcher.once("aggregated", function(changes) {
		if(this.inputFileSystem && this.inputFileSystem.purge) {
			this.inputFileSystem.purge(changes);
		}
		var times = this.watcher.getTimes();
		callback(null, changes.filter(function(file) {
			return files.indexOf(file) >= 0;
		}).sort(), changes.filter(function(file) {
			return dirs.indexOf(file) >= 0;
		}).sort(), changes.filter(function(file) {
			return missing.indexOf(file) >= 0;
		}).sort(), times, times);
	}.bind(this));

	this.watcher.watch(files.concat(missing), dirs, startTime);

	if(oldWatcher) {
		oldWatcher.close();
	}
	return {
		close: function() {
			this.watcher.close();
		}.bind(this),
		pause: function() {
			this.watcher.pause();
		}.bind(this)
	};
};
