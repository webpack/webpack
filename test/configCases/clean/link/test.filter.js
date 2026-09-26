"use strict";

const fs = require("fs");
const path = require("path");

module.exports = () => {
	// two suites run this filter at once, so each process probes its own path
	const link = path.join(__dirname, `.testlink-${process.pid}`);
	try {
		fs.symlinkSync(path.join(__dirname, "index.js"), link, "file");
		fs.unlinkSync(link);
		return true;
	} catch (_err) {
		return false;
	}
};
