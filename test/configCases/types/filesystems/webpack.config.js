const memfs = require("memfs");
const fs = require("fs");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			compiler.outputFileSystem = memfs.fs;
			compiler.inputFileSystem = memfs.fs;
			compiler.intermediateFileSystem = memfs.fs;

			compiler.outputFileSystem = fs;
			compiler.inputFileSystem = fs;
			compiler.intermediateFileSystem = fs;
		}
	]
};
