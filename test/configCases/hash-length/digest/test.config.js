"use strict";

const fs = require("fs");

// base64url is filename-safe (A-Z a-z 0-9 - _); base62 is alphanumeric.
const charsets = [
	/^bundle0\.[A-Za-z0-9_-]{8}\.js$/,
	/^bundle1\.[A-Za-z0-9]{10}\.js$/,
	/^bundle2\.[A-Za-z0-9_-]{8}\.js$/
];

module.exports = {
	findBundle(i, options) {
		const files = fs.readdirSync(options.output.path);
		const filename = files.find((file) => charsets[i].test(file));
		if (!filename) {
			throw new Error(
				`No bundle matching ${charsets[i]} found in ${files.join(", ")}`
			);
		}
		return `./${filename}`;
	}
};
