/**
 * @param {string} name
 */
module.exports = function(name) {
	var a = load(require, name);
	var r = require;
	var b = r(name);
	if(a !== b) return "FAIL";
	return a;
}

/**
 * @param {Function} requireFunction
 * @param {string} name
 */
function load(requireFunction, name) {
	return requireFunction(name);
}