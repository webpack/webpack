require = require("../require-polyfill")(require.valueOf());

var fs = require("fs");

module.exports = function(template, filesReq, stdout, prefix) {

	var regexp = new RegExp("\\{\\{" + (prefix ? prefix+":" : "") + "([^:\\}]+)\\}\\}", "g")
	var cwd = process.cwd();
	cwd = cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	cwd = new RegExp(cwd, "g");
	
	return template.replace(regexp, function(match) {
		match = match.substr(2 + (prefix ? prefix.length+1 : 0), match.length - 4 - (prefix ? prefix.length+1 : 0));
		if(match === "stdout")
			return stdout;
		return filesReq("./" + match);
	}).replace(cwd, ".");
	
}