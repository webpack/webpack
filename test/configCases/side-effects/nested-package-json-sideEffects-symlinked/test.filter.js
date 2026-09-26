"use strict";

const fs = require("fs");
const path = require("path");

// codes a machine that cannot make directory symlinks reports
const SYMLINK_UNSUPPORTED = new Set(["EPERM", "EACCES", "ENOSYS", "UNKNOWN"]);

/** @type {(link: string) => void} */
const removeLink = (link) => {
	try {
		fs.unlinkSync(link);
		return;
	} catch (_err) {
		// a junction on Windows unlinks as a directory
	}
	try {
		fs.rmdirSync(link);
	} catch (_err) {
		// nothing was there
	}
};

module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	// suites run this filter at once, as processes or (under Bun) threads of one
	// process sharing a pid, so each call probes inside a directory of its own
	const directory = fs.mkdtempSync(
		path.join(parent, "side-effects-symlinked-probe-")
	);
	const probe = path.join(directory, "probe");
	try {
		fs.symlinkSync(path.join(__dirname, "package"), probe, "junction");
	} catch (err) {
		// anything else is a broken fixture, which must fail rather than skip
		if (
			!SYMLINK_UNSUPPORTED.has(/** @type {NodeJS.ErrnoException} */ (err).code)
		) {
			throw err;
		}
		return false;
	} finally {
		removeLink(probe);
		fs.rmdirSync(directory);
	}
	return true;
};
