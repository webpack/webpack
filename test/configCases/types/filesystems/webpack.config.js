"use strict";

const fs = require("fs");
const memfs = require("memfs");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			// @ts-expect-error bad types
			compiler.outputFileSystem = memfs.fs;
			// @ts-expect-error bad types
			compiler.inputFileSystem = memfs.fs;
			// @ts-expect-error bad types
			compiler.intermediateFileSystem = memfs.fs;

			compiler.outputFileSystem = fs;
			compiler.inputFileSystem = fs;
			compiler.intermediateFileSystem = fs;
		}
	]
};
