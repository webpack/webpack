/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const fs = require("fs");
const path = require("path");

function lessStrict(regExpStr) {
	regExpStr = regExpStr
		.replace(/node_modules/g, "(node_modules|~)")
		.replace(/(\\\/|\\\\)/g, "[\\/\\\\]");
	return regExpStr;
}

const runtimeRegexp = /(```\s*(?:js|javascript)\n)?(.*)(\/\*\*\*\*\*\*\/ \(function\(modules\) \{ \/\/ webpackBootstrap\n(?:.|\n)*?\n\/\*\*\*\*\*\*\/ \}\)\n\/\**\/\n)/;
const timeRegexp = /\s*Time: \d+ms/g;
const buildAtRegexp = /\s*Built at: .+/mg;
const hashRegexp = /Hash: [a-f0-9]+/g;

exports.replaceBase = (template) => {

	let cwd = process.cwd();
	let webpack = path.join(__dirname, "..");
	let webpackParent = path.join(__dirname, "..", "..");
	cwd = lessStrict(cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	cwd = new RegExp(cwd, "g");
	webpack = lessStrict(webpack.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpack = new RegExp(webpack, "g");
	webpackParent = lessStrict(webpackParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpackParent = new RegExp(webpackParent, "g");

	return template
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(cwd, ".")
		.replace(webpack, "(webpack)")
		.replace(webpackParent, "(webpack)/~")
		.replace(timeRegexp, "")
		.replace(buildAtRegexp, "")
		.replace(hashRegexp, "Hash: 0a1b2c3d4e5f6a7b8c9d")
		.replace(/\.chunkhash\./g, ".[chunkhash].")
		.replace(runtimeRegexp, function(match) {
			match = runtimeRegexp.exec(match);
			const prefix = match[1] ? "" : "```\n";
			const inner = match[1] ? match[1] : "``` js\n";
			return prefix + "<details><summary><code>" + match[2] + "/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>\n\n" + inner + match[2] + match[3] + "```\n\n</details>\n\n" + inner;
		});
};

exports.needResults = (template, prefix) => {
	const regExp = prefix ? new RegExp(`\\{\\{${prefix}:`) : /\{\{/;
	return regExp.test(template);
};

exports.replaceResults = (template, baseDir, stdout, prefix) => {
	const regexp = new RegExp("\\{\\{" + (prefix ? prefix + ":" : "") + "([^:\\}]+)\\}\\}", "g");

	return template.replace(regexp, function(match) {
		match = match.substr(2 + (prefix ? prefix.length + 1 : 0), match.length - 4 - (prefix ? prefix.length + 1 : 0));
		if(match === "stdout")
			return stdout;
		return fs.readFileSync(path.join(baseDir, match), "utf-8").replace(/[\r\n]*$/, "");
	});
};
