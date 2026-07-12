"use strict";

const fs = require("node:fs");
const path = require("node:path");

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
	} catch {
		try {
			fs.rmdirSync(real);
		} catch {
			// ignore cleanup failure
		}
		return false;
	}
};
