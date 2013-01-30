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

NodeWatchFileSystem.prototype.watch = function(files, dirs, startTime, delay, callback) {
	var closed = false;
	setTimeout(function() {
		var fileTs = {};
		async.forEach(files, function(file, callback) {
			fs.stat(file, function(err, stat) {
				var ts = err ? Infinity : stat.mtime;
				fileTs[file] = ts;
				callback();
			});
		}, function(err) {
			if(closed) return;
			if(err) return callback(err);
			if(this.inputFileSystem.purge) this.inputFileSystem.purge();
			return callback(null, [], fileTs, {});
		}.bind(this));
	}.bind(this), 1000);
	return {
		close: function() {
			closed = true;
		}
	}
};
