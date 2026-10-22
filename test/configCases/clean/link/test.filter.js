"use strict";

const fs = require("fs");
const path = require("path");

module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	// suites run this filter at once, as processes or (under Bun) threads of one
	// process sharing a pid, so each call probes inside a directory of its own
	const directory = fs.mkdtempSync(path.join(parent, "clean-link-probe-"));
	const link = path.join(directory, "link");
	try {
		fs.symlinkSync(path.join(__dirname, "index.js"), link, "file");
		fs.unlinkSync(link);
		return true;
	} catch (_err) {
		return false;
	} finally {
		fs.rmdirSync(directory);
	}
};
