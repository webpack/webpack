"use strict";

const fs = require("fs");
const path = require("path");
const MTIME = require("./mtime");

const source = path.resolve(__dirname, "static/note.txt");

// a checkout stamps the fixture with the time it was written, and the copy is
// asserted against a known one — set only when it differs, so a rebuild of the
// same tree reads an unchanged file
if (fs.statSync(source).mtimeMs !== MTIME) {
	fs.utimesSync(source, new Date(MTIME), new Date(MTIME));
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "static", to: "kept", preserveTimestamps: true },
			{ from: "static", to: "stamped" }
		]
	}
};
