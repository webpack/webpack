exports = module.exports = new (require("events").EventEmitter);
if(Object.prototype.__defineGetter__) {
	exports.__defineGetter__("title", function() { return window.title; });
	exports.__defineSetter__("title", function(t) { window.title = t; });
} else {
	exports.title = window.title;
}
exports.version = exports.arch = 
exports.platform = exports.execPath = "webpack";
// TODO stdin, stdout, stderr
exports.argv = ["webpack", "browser"];
exports.pid = 1;
exports.nextTick = function(func) {
	setTimeout(func, 0);
}
exports.exit = exports.kill = 
exports.chdir = exports.cwd = 
exports.umask = exports.dlopen = 
exports.uptime = exports.memoryUsage = 
exports.uvCounters = exports.binding = function() {};
exports.features = {};