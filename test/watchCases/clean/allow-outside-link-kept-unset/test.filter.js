"use strict";

const fs = require("fs");
const path = require("path");

// Skip where file symlinks cannot be created (e.g. Windows without the
// required privilege).
module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	// suites run this filter at once, so each call probes in its own directory
	const directory = fs.mkdtempSync(
		path.join(parent, "clean-allow-outside-link-kept-unset-probe-")
	);
	const real = path.join(directory, "real");
	const link = path.join(directory, "link");
	try {
		fs.writeFileSync(real, "");
		fs.symlinkSync(real, link, "file");
		fs.unlinkSync(link);
		return true;
	} catch (_err) {
		return false;
	} finally {
		try {
			fs.unlinkSync(real);
		} catch (_err) {
			// never made
		}
		fs.rmdirSync(directory);
	}
};
