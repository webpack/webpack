module.exports = function(arg) {
	try {
		var a = require(arg + ".js");
	} catch(e) {}
	try {
		var b = require("" + arg + ".js");
	} catch(e) {}
	try {
		var c = require("./" + arg + ".js");
	} catch(e) {}
	try {
		var d = require("./" + arg);
	} catch(e) {}
	return {a: typeof a === "function", b: typeof b === "function", c: typeof c === "function", d: typeof d === "function"}
};