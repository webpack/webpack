"use strict";

const fs = require("fs");
const path = require("path");
const MTIME = require("./mtime");

const source = path.resolve(__dirname, "static/note.txt");

// a checkout stamps the fixture with the time it was written, so it is pinned
// to a known one — only when it differs, leaving it untouched on a rebuild
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
