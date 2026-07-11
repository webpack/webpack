"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * @param {{ output: { path: string } }} options options
 * @param {RegExp} regexp regexp
 * @param {string=} subpath path in output directory
 * @returns {string[]} files
 */
module.exports = function findOutputFiles(options, regexp, subpath) {
	const files = fs.readdirSync(
		subpath ? path.join(options.output.path, subpath) : options.output.path
	);

	return files.filter((file) => regexp.test(file));
};
