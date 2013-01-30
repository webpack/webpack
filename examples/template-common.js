/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");

module.exports = function(template, baseDir, stdout, prefix) {

	var regexp = new RegExp("\\{\\{" + (prefix ? prefix+":" : "") + "([^:\\}]+)\\}\\}", "g")
	var cwd = process.cwd();
	cwd = cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	cwd = new RegExp(cwd, "g");
	
	return template.replace(regexp, function(match) {
		match = match.substr(2 + (prefix ? prefix.length+1 : 0), match.length - 4 - (prefix ? prefix.length+1 : 0));
		if(match === "stdout")
			return stdout;
		return fs.readFileSync(path.join(baseDir, match), "utf-8");
	}).replace(cwd, ".");
	
}