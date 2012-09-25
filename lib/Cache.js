/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");

function Cache(options) {
	this.options = options = options || {};
	if(!this.options.stat) this.options.stat = fs.stat;
	this.map = {};
}
var $ = Cache.prototype;
module.exports = Cache;

$.get = function(request, callback) {
	var self = this;
	var item = self.map[request];
	if(!item) return callback(new Error("No Entry"));
	var count = item.files.length;
	var invalid = false;
	item.files.forEach(function(file) {
		this.options.stat(file.path, function(err, stat) {
			if(err) return invalidate(err.toString());
			if(!stat) return invalidate("Cannot read stat");
			if(stat.mtime.getTime() !== file.time)
				return invalidate("File " + file.path + " has changed");
			valid();
		});
	}, this);
	if(item.files.length === 0) valid();
	function invalidate(msg) {
		if(invalid) return;
		invalid = true;
		callback(new Error(msg));
	}
	function valid() {
		if(invalid) return;
		count--;
		if(count <= 0)
			callback(null, item.value);
	}
}

$.store = function(request, dependencies, startTime, value) {
	var count = dependencies.length + 1;
	var files = [];
	var endOne = function() {
		if(--count == 0) {
			this.map[request] = {
				files: files,
				value: value
			}
		}
	}.bind(this);
	dependencies.forEach(function(file) {
		this.options.stat(file, function(err, stat) {
			if(err) return; // do not cache it.
			if(stat.mtime.getTime() > startTime.getTime()) return; // do not cache it.
			files.unshift({
				path: file,
				time: stat.mtime.getTime()
			});
			endOne();
		});
	}, this);
	endOne();
}
