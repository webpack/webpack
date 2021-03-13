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

const runtimeModulesRegexp = /(\/\*{72}\/\n(?:\/(?:\*{6}|\*{72})\/.*\n)*\/\*{72}\/\n)/g;
const timeRegexp = / in \d+ ms/g;
const dataUrlRegexp = /("data:[^"]+")/g;

exports.replaceBase = (template) => {

	const cwd = process.cwd();
	let webpack = path.join(__dirname, "..");
	let webpackParent = path.join(__dirname, "..", "..");
	const cwdRegExpStr = lessStrict(cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	const cwdRegExp = new RegExp(cwdRegExpStr, "g");
	const cwdSlashRegExp = new RegExp(cwdRegExpStr + "[\\/\\\\]", "g");
	webpack = lessStrict(webpack.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpack = new RegExp(webpack, "g");
	webpackParent = lessStrict(webpackParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpackParent = new RegExp(webpackParent, "g");

	return template
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\[webpack-cli\].+\n/g, "")
		.replace(cwdSlashRegExp, "./")
		.replace(cwdRegExp, ".")
		.replace(webpack, "(webpack)")
		.replace(webpackParent, "(webpack)/~")
		.replace(timeRegexp, "")
		.replace(dataUrlRegexp, function(match) {
			if(match.length < 100) return match;
			return match.slice(0, 50) + "..." + match.slice(-10);
		})
		.replace(/\.chunkhash\./g, ".[chunkhash].")
		.replace(runtimeModulesRegexp, function(match, content) {
			return "```\n\n<details><summary>"+
			"<code>/* webpack runtime code */</code>"+
			"</summary>\n\n``` js\n" + content + "```\n\n</details>\n\n``` js\n";
		});
};

exports.needResults = (template, prefix) => {
	const regExp = prefix ? new RegExp(`_\\{\\{${prefix}:`) : /_\{\{/;
	return regExp.test(template);
};

exports.replaceResults = (template, baseDir, stdout, prefix) => {
	const regexp = new RegExp("_\\{\\{" + (prefix ? prefix + ":" : "") + "([^:\\}]+)\\}\\}_", "g");

	return template.replace(regexp, function(match) {
		match = match.substr(3 + (prefix ? prefix.length + 1 : 0), match.length - 6 - (prefix ? prefix.length + 1 : 0));
		if(match === "stdout")
			return stdout;
		try {
			return fs.readFileSync(path.join(baseDir, match), "utf-8").replace(/[\r\n]*$/, "");
		} catch(e) {
			e.message += `\nwhile reading '${match}' in '${baseDir}`;
			throw e;
		}
	});
};
