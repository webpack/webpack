const memfs = require("memfs");
const fs = require("fs");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			// eslint-disable-next-line no-warning-comments
			// @ts-ignore
			compiler.outputFileSystem = memfs.fs;
			// eslint-disable-next-line no-warning-comments
			// @ts-ignore
			compiler.inputFileSystem = memfs.fs;
			// eslint-disable-next-line no-warning-comments
			// @ts-ignore
			compiler.intermediateFileSystem = memfs.fs;

			compiler.outputFileSystem = fs;
			compiler.inputFileSystem = fs;
			compiler.intermediateFileSystem = fs;
		}
	]
};
