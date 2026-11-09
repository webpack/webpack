"use strict";

const fs = require("fs");
const path = require("path");

// Skip where a directory name cannot hold a `*` (e.g. Windows).
module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	// suites run this filter at once, so each call probes inside a directory of
	// its own
	const directory = fs.mkdtempSync(
		path.join(parent, "html-markers-in-module-paths-probe-")
	);
	const probe = path.join(directory, "a*b");
	try {
		fs.mkdirSync(probe);
		fs.rmdirSync(probe);
		return true;
	} catch (_err) {
		return false;
	} finally {
		fs.rmdirSync(directory);
	}
};
