"use strict";

const fs = require("fs");
const path = require("path");

module.exports = () => {
	const parent = path.resolve(__dirname, "../../../js");
	fs.mkdirSync(parent, { recursive: true });
	const directory = fs.mkdtempSync(
		path.join(parent, "retargeted-symlink-probe-")
	);
	const target = path.join(directory, "target");
	const link = path.join(directory, "link");
	fs.mkdirSync(target);
	try {
		fs.symlinkSync(target, link, "dir");
		fs.unlinkSync(link);
		return true;
	} catch (_err) {
		return false;
	} finally {
		fs.rmdirSync(target);
		fs.rmdirSync(directory);
	}
};
