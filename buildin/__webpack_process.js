exports = module.exports = new (require("events").EventEmitter);
if(Object.prototype.__defineGetter__) {
	exports.__defineGetter__("title", function() { return window.title; });
	exports.__defineSetter__("title", function(t) { window.title = t; });
} else {
	exports.title = window.title;
}
exports.version = exports.arch = 
exports.execPath = "webpack";
exports.platform = "browser";
// TODO stdin, stdout, stderr
exports.argv = ["webpack", "browser"];
exports.pid = 1;
exports.nextTick = (function(func) {
	// from https://github.com/substack/node-browserify/blob/master/wrappers/process.js
	var queue = [];
	var canPost = typeof window !== 'undefined'
		&& window.postMessage && window.addEventListener
	;

	if (canPost) {
		window.addEventListener('message', function (ev) {
			if (ev.source === window && ev.data === 'webpack-tick') {
				ev.stopPropagation();
				if (queue.length > 0) {
					var fn = queue.shift();
					fn();
				}
			}
		}, true);
	}

	return function (fn) {
		if (canPost) {
			queue.push(fn);
			window.postMessage('webpack-tick', '*');
		}
		else setTimeout(fn, 0);
	};
}());
exports.cwd = function() {
	return "/app";
}
exports.exit = exports.kill = 
exports.chdir = 
exports.umask = exports.dlopen = 
exports.uptime = exports.memoryUsage = 
exports.uvCounters = function() {};
exports.features = {};
exports.binding = function(str) {
	return {};
}