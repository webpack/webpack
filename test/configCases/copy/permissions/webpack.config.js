"use strict";

const fs = require("fs");
const path = require("path");

/**
 * A checkout is not guaranteed to carry the executable bit, and the copy is
 * asserted against a known mode. Set only when it differs, so a rebuild of the
 * same tree reads an unchanged file.
 * @param {string} name path of the file, relative to this directory
 * @param {number} mode permissions it must carry
 * @returns {void}
 */
const setMode = (name, mode) => {
	const file = path.resolve(__dirname, name);

	if ((fs.statSync(file).mode & 0o777) !== mode) fs.chmodSync(file, mode);
};

setMode("files/run.sh", 0o755);
setMode("files/plain.txt", 0o644);

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "files", to: "kept", preservePermissions: true },
			{ from: "files", to: "default" }
		]
	}
};
