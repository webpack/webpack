"use strict";

const fs = require("fs");
const path = require("path");

// codes a machine that cannot make directory symlinks reports
const SYMLINK_UNSUPPORTED = new Set(["EPERM", "EACCES", "ENOSYS", "UNKNOWN"]);

module.exports = () => {
	const probe = path.resolve(
		__dirname,
		"../../../js/side-effects-symlinked-probe"
	);
	fs.mkdirSync(path.dirname(probe), { recursive: true });
	// a probe a failed cleanup left behind would read as EEXIST, i.e. "cannot"
	fs.rmSync(probe, { recursive: true, force: true });
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
	try {
		fs.rmSync(probe, { recursive: true, force: true });
	} catch (_err) {
		// the next run clears it
	}
	return true;
};
