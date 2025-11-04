/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} regExpStr reg exp string
 * @returns {string} less strict string regexp
 */
function lessStrict(regExpStr) {
	regExpStr = regExpStr
		.replace(/node_modules/g, "(node_modules|~)")
		.replace(/(\\\/|\\\\)/g, "[\\/\\\\]");
	return regExpStr;
}

const runtimeModulesRegexp =
	/(\/\*{72}\/\n(?:\/(?:\*{6}|\*{72})\/.*\n)*\/\*{72}\/\n)/g;
const timeRegexp = / in \d+ ms/g;
const dataUrlRegexp = /("data:[^"]+")/g;

/**
 * @param {string} template template
 * @param {string} prefix prefix
 * @returns {boolean} true when need results, otherwise false
 */
const needResults = (template, prefix) => {
	const regExp = prefix ? new RegExp(`_\\{\\{${prefix}:`) : /_\{\{/;
	return regExp.test(template);
};

/**
 * @param {string} template template
 * @returns {string} template with base replacements
 */
const replaceBase = (template) => {
	const cwd = process.cwd();
	let webpack = path.join(__dirname, "..");
	let webpackParent = path.join(__dirname, "..", "..");
	const cwdRegExpStr = lessStrict(
		cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
	);
	const cwdRegExp = new RegExp(cwdRegExpStr, "g");
	const cwdSlashRegExp = new RegExp(`${cwdRegExpStr}[\\/\\\\]`, "g");

	webpack = lessStrict(webpack.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	webpackParent = lessStrict(
		webpackParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
	);

	const webpackRegExp = new RegExp(webpack, "g");
	const webpackParentRegExp = new RegExp(webpackParent, "g");

	return template
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\[webpack-cli\].+\n/g, "")
		.replace(cwdSlashRegExp, "./")
		.replace(cwdRegExp, ".")
		.replace(webpackRegExp, "(webpack)")
		.replace(webpackParentRegExp, "(webpack)/~")
		.replace(timeRegexp, "")
		.replace(dataUrlRegexp, (match) => {
			if (match.length < 100) return match;
			return `${match.slice(0, 50)}...${match.slice(-10)}`;
		})
		.replace(/\.chunkhash\./g, ".[chunkhash].")
		.replace(
			runtimeModulesRegexp,
			(match, content) =>
				"```\n\n<details><summary>" +
				"<code>/* webpack runtime code */</code>" +
				`</summary>\n\n\`\`\` js\n${content}\`\`\`\n\n</details>\n\n\`\`\` js\n`
		);
};

/**
 * @param {string} template template
 * @param {string} baseDir base dir
 * @param {string} stdout stdout
 * @param {string} prefix prefix
 * @returns {string} template with replacements
 */
const replaceResults = (template, baseDir, stdout, prefix) => {
	const regexp = new RegExp(
		`_\\{\\{${prefix ? `${prefix}:` : ""}([^:\\}]+)\\}\\}_`,
		"g"
	);

	return template.replace(regexp, (match) => {
		match = match.slice(3 + (prefix ? prefix.length + 1 : 0), -3);
		if (match === "stdout") return stdout;
		try {
			return fs
				.readFileSync(path.join(baseDir, match), "utf8")
				.replace(/[\r\n]*$/, "");
		} catch (err) {
			/** @type {Error} */
			(err).message += `\nwhile reading '${match}' in '${baseDir}`;
			throw err;
		}
	});
};

module.exports = { needResults, replaceBase, replaceResults };
