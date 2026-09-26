"use strict";

const fs = require("fs");
const path = require("path");

// Skip where directory junctions / symlinks cannot be created (e.g. Windows
// without the required privilege).
module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	// suites run this filter at once, as processes or (under Bun) threads of one
	// process sharing a pid, so each call probes inside a directory of its own
	const directory = fs.mkdtempSync(
		path.join(parent, "emit-through-junction-probe-")
	);
	const real = path.join(directory, "real");
	const link = path.join(directory, "link");
	try {
		fs.mkdirSync(real);
		fs.symlinkSync(real, link, "junction");
		fs.unlinkSync(link);
		return true;
	} catch (_err) {
		return false;
	} finally {
		try {
			fs.rmdirSync(real);
		} catch (_err) {
			// never made
		}
		fs.rmdirSync(directory);
	}
};
