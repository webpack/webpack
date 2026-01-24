"use strict";

const path = require("path");

/**
 * @param {string} path path
 * @returns {string} subPath
 */
const getSubPath = (path) => {
	let subPath = "";
	const lastSlash = path.lastIndexOf("/");
	let firstSlash = path.indexOf("/");
	if (lastSlash !== -1 && firstSlash !== lastSlash) {
		if (firstSlash !== -1) {
			let next = path.indexOf("/", firstSlash + 1);
			let dir = path.slice(firstSlash + 1, next);

			while (dir === ".") {
				firstSlash = next;
				next = path.indexOf("/", firstSlash + 1);
				dir = path.slice(firstSlash + 1, next);
			}
		}
		subPath = path.slice(firstSlash + 1, lastSlash + 1);
	}
	return subPath;
};

/**
 * @param {string} path path
 * @returns {boolean} whether path is a relative path
 */
const isRelativePath = (path) => /^\.\.?\//.test(path);

/**
 * @param {string} url url
 * @param {string} outputDirectory outputDirectory
 * @returns {string} absolute path
 */
const urlToPath = (url, outputDirectory) => {
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	else if (url.startsWith("https://test.cases/")) url = url.slice(19);
	return path.resolve(outputDirectory, `./${url}`);
};

/**
 * @param {string} url url
 * @returns {string} relative path
 */
const urlToRelativePath = (url) => {
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	else if (url.startsWith("https://test.cases/")) url = url.slice(19);
	return `./${url}`;
};

/**
 * @returns {number[]} version arr
 */
const getNodeVersion = () => process.versions.node.split(".").map(Number);

const ESModuleStatus = Object.freeze({
	Unlinked: "unlinked",
	Evaluated: "evaluated"
});

module.exports = {
	ESModuleStatus,
	getNodeVersion,
	getSubPath,
	isRelativePath,
	urlToPath,
	urlToRelativePath
};
