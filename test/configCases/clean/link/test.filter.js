"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = () => {
	try {
		fs.symlinkSync(
			path.join(__dirname, "index.js"),
			path.join(__dirname, ".testlink"),
			"file"
		);
		fs.unlinkSync(path.join(__dirname, ".testlink"));
		return true;
	} catch {
		return false;
	}
};
