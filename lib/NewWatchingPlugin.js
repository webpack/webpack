/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Watchpack = require("watchpack");

function NewWatchingPlugin() {
}
module.exports = NewWatchingPlugin;

NewWatchingPlugin.prototype.apply = function(compiler) {
	compiler.plugin("environment", function() {
		compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
	});
};

function NodeWatchFileSystem(inputFileSystem) {
	this.inputFileSystem = inputFileSystem;
	this.watcherOptions = {
		aggregateTimeout: 0
	};
	this.watcher = new Watchpack(this.watcherOptions);
}

NodeWatchFileSystem.prototype.watch = function watch(files, dirs, startTime, delay, callback, callbackUndelayed) {
	var oldWatcher = this.watcher;
	this.watcher = new Watchpack({
		aggregateTimeout: delay
	});

	var onChange = function() {
		callbackUndelayed();
	}.bind(this);
	this.watcher.once("change", onChange);
	this.watcher.once("aggregated", function(changes) {
		if(this.inputFileSystem && this.inputFileSystem.purge) {
			this.inputFileSystem.purge(changes);
		}
		var times = this.watcher.getTimes();
		callback(null, changes.filter(function(file) {
			return files.indexOf(file) >= 0;
		}).sort(), changes.filter(function(file) {
			return dirs.indexOf(file) >= 0;
		}).sort(), times, times);
	}.bind(this));

	this.watcher.watch(files, dirs, startTime);

	if(oldWatcher) {
		oldWatcher.close();
	}
	return {
		close: function() {
			this.watcher.pause();
		}.bind(this)
	}
};