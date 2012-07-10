/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");

var MAX_DURATION = 2000;
var lastTime = new Date();
var cache = {};

module.exports = function(pathname, callback) {
	var currentTime = new Date();

	// clear all if old
	if(currentTime - lastTime > MAX_DURATION)
		cache = {};

	var cacheEntry = cache[pathname];

	if(cacheEntry) {
		if(cacheEntry.listeners)
			return cacheEntry.listeners.push(callback);
		else if(currentTime - cacheEntry.time <= MAX_DURATION)
			return callback(cacheEntry.err, cacheEntry.result);
	}

	var listeners = [callback];
	cache[pathname] = cacheEntry = {
		listeners: listeners
	};

	// do the request
	lastTime = currentTime;
	// console.log("request to " + pathname);
	fs.stat(pathname, function(err, result) {
		cacheEntry.time = currentTime;
		cacheEntry.err = err;
		cacheEntry.result = result;
		delete cacheEntry.listeners;
		listeners.forEach(function(listener) {
			listener(err, result);
		});
	});
}