"use strict";

const fs = require("fs");
const path = require("path");

// Skip where directory junctions / symlinks cannot be created (e.g. Windows
// without the required privilege).
module.exports = () => {
	// two suites run this filter at once, so each process probes its own path
	const real = path.join(__dirname, `.testreal-${process.pid}`);
	const link = path.join(__dirname, `.testlink-${process.pid}`);
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
