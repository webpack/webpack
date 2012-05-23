/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");

function Cache(options) {
	this.options = options = options || {};
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
		fs.stat(file.path, function(err, stat) {
			if(err) return invalidate(err.toString());
			if(!stat) return invalidate("Cannot read stat");
			if(stat.mtime.getTime() !== file.time)
				return invalidate("File " + file.path + " has changed");
			valid();
		});
	});
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

$.create = function(request) {
	var self = this;
	var item = {
		files: []
	};
	return {
		add: function(path) {
			item.files.push({
				path: path,
				// TODO do it asynchronly
				time: fs.statSync(path).mtime.getTime()
			});
		},
		clear: function() {
			item.files.length = 0;
		},
		save: function(value) {
			item.value = value;
			self.map[request] = item;
		}
	}
}