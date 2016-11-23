/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");

function lessStrict(regExpStr) {
	regExpStr = regExpStr
		.replace(/node_modules/g, "(node_modules|~)")
		.replace(/(\\\/|\\\\)/g, "[\\/\\\\]")
	return regExpStr;
}

var runtimeRegexp = /(```\s*(?:js|javascript)\n)(\/\*\*\*\*\*\*\/ \(function\(modules\) \{ \/\/ webpackBootstrap\n(?:.|\n)*\n\/\*\*\*\*\*\*\/ \}\)\n\/\**\/\n)/;

module.exports = function(template, baseDir, stdout, prefix) {

	var regexp = new RegExp("\\{\\{" + (prefix ? prefix+":" : "") + "([^:\\}]+)\\}\\}", "g")
	var cwd = process.cwd();
	var webpack = path.join(__dirname, "..");
	var webpackParent = path.join(__dirname, "..", "..");
	cwd = lessStrict(cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	cwd = new RegExp(cwd, "g");
	webpack = lessStrict(webpack.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpack = new RegExp(webpack, "g");
	webpackParent = lessStrict(webpackParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpackParent = new RegExp(webpackParent, "g");
	
	return template.replace(regexp, function(match) {
		match = match.substr(2 + (prefix ? prefix.length+1 : 0), match.length - 4 - (prefix ? prefix.length+1 : 0));
		if(match === "stdout")
			return stdout;
		return fs.readFileSync(path.join(baseDir, match), "utf-8").replace(/[\r\n]*$/, "");
	})
		.replace(/\r\n/g, "\n")
		.replace(cwd, ".")
		.replace(webpack, "(webpack)")
		.replace(webpackParent, "(webpack)/~")
		.replace(runtimeRegexp, function(match) {
			match = runtimeRegexp.exec(match);
			return "<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>\n" + match[1] + match[2] + "```\n</details>\n" + match[1];
		});
	
}