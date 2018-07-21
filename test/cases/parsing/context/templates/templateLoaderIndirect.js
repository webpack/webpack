module.exports = function(name) {
	var a = load(require, name);
	var r = require;
	var b = r(name);
	if(a !== b) return "FAIL";
	return a;
}

function load(requireFunction, name) {
	return requireFunction(name);
}