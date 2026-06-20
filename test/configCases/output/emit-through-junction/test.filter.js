"use strict";

const fs = require("fs");
const path = require("path");

// Skip where directory junctions / symlinks cannot be created (e.g. Windows
// without the required privilege).
module.exports = () => {
	const real = path.join(__dirname, ".testreal");
	const link = path.join(__dirname, ".testlink");
	try {
		fs.mkdirSync(real, { recursive: true });
		fs.symlinkSync(real, link, "junction");
		fs.unlinkSync(link);
		fs.rmdirSync(real);
		return true;
	} catch (_err) {
		try {
			fs.rmdirSync(real);
		} catch (_err2) {
			// ignore cleanup failure
		}
		return false;
	}
};
