"use strict";

const fs = require("fs");
const path = require("path");

// creating a directory symlink needs privileges this machine may not grant
module.exports = () => {
	const probe = path.resolve(
		__dirname,
		"../../../js/side-effects-symlinked-probe"
	);
	fs.mkdirSync(path.dirname(probe), { recursive: true });
	// clear a probe a failed cleanup left behind, or every later run reads its
	// EEXIST as "no symlinks here" and skips the case for good
	fs.rmSync(probe, { recursive: true, force: true });
	try {
		fs.symlinkSync(path.join(__dirname, "package"), probe, "junction");
	} catch (_err) {
		return false;
	}
	try {
		fs.rmSync(probe, { recursive: true, force: true });
	} catch (_err) {
		// the next run clears it
	}
	return true;
};
