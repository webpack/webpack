"use strict";

const fs = require("fs");
const path = require("path");

// lockfiles the non-frozen configs write into this directory at run time
const generatedLockfiles = [
	"dev-defaults.webpack.lock",
	"encoding-case.webpack.lock",
	"decompression-errors.webpack.lock"
];

const removeGeneratedLockfiles = () => {
	for (const name of generatedLockfiles) {
		try {
			fs.unlinkSync(path.join(__dirname, name));
		} catch (_err) {
			// Empty
		}
	}
};

module.exports = {
	afterExecute: removeGeneratedLockfiles,
	beforeExecute: removeGeneratedLockfiles
};
