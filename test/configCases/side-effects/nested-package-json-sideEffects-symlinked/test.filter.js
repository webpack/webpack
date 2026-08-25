"use strict";

const fs = require("fs");
const path = require("path");

// creating a directory symlink needs privileges this machine may not grant
module.exports = () => {
	const probe = path.resolve(
		__dirname,
		"../../../js/side-effects-symlinked-probe"
	);
	try {
		fs.mkdirSync(path.dirname(probe), { recursive: true });
		fs.symlinkSync(path.join(__dirname, "package"), probe, "junction");
	} catch (_err) {
		return false;
	}
	try {
		fs.rmSync(probe, { recursive: true, force: true });
	} catch (_err) {
		// a leftover probe under test/js is harmless
	}
	return true;
};
