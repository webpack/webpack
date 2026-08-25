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
	const probe = path.resolve(
		__dirname,
		"../../../js/side-effects-symlinked-probe"
	);
	fs.mkdirSync(path.dirname(probe), { recursive: true });
	// a probe a failed cleanup left behind would read as EEXIST, i.e. "cannot"
	removeLink(probe);
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
	}
	removeLink(probe);
	return true;
};
