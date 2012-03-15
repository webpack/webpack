var console = window.console;
exports.log = (console && console.log) || function() {};
exports.info = (console && console.info) || function() {};
exports.error = (console && console.error) || function() {};
exports.warn = (console && console.warn) || function() {};
exports.dir = (console && console.dir) || function() {};
exports.time = (console && console.time) || function(label) {
	times[label] = Date.now();
};
exports.timeEnd = (console && console.timeEnd) || function() {
	var duration = Date.now() - times[label];
	exports.log('%s: %dms', label, duration);
};
exports.trace = (console && console.trace) || function() {};
exports.assert = (console && console.assert) || function() {};