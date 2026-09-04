"use strict";

const fs = require("fs");
const path = require("path");

// codes a machine that cannot make symlinks of that kind reports
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

/**
 * @param {string} probe path the link is made at
 * @param {string} target what it points at
 * @param {"junction" | "dir" | "file"} type kind of link
 * @returns {boolean} true, when this machine can make one
 */
const canLink = (probe, target, type) => {
	// a probe a failed cleanup left behind would read as EEXIST, i.e. "cannot"
	removeLink(probe);
	try {
		fs.symlinkSync(target, probe, type);
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

module.exports = () => {
	const probe = path.resolve(__dirname, "../../../js/copy-symlink-probe");
	fs.mkdirSync(path.dirname(probe), { recursive: true });
	// the case both walks links and emits them, and Windows gates each kind
	// separately — a junction needs no privilege where the other two do
	return (
		canLink(probe, __dirname, "junction") &&
		canLink(probe, __dirname, "dir") &&
		canLink(probe, __filename, "file")
	);
};
