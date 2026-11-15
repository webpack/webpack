/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { relative } = require("../fs/fs");
const { isOutsideDirectory } = require("../util/identifier");

/** @import { Output } from "../../declarations/WebpackOptions" */
/** @import { OutputFileSystem } from "../fs/fs" */

/**
 * Whether `output.allowOutside` lets a file be written at a path outside of `output.path`.
 * @param {OutputFileSystem} fs output file system
 * @param {Output["allowOutside"]} allowOutside the option, `undefined` allows nothing
 * @param {string} targetPath absolute path of the file
 * @returns {boolean} true, when the path is inside a directory the option lists, or it is `true`
 */
const isOutsideAllowed = (fs, allowOutside, targetPath) => {
	if (allowOutside === true) return true;
	if (!Array.isArray(allowOutside)) return false;
	for (const directory of allowOutside) {
		if (!isOutsideDirectory(relative(fs, directory, targetPath))) return true;
	}
	return false;
};

module.exports.isOutsideAllowed = isOutsideAllowed;
